# ComfyUI SDK 移行計画

## 目的

現在の `src/services/api.ts` における ComfyUI API 通信実装を、`@saintno/comfyui-sdk` を使用するように書き換えます。これにより、コードの簡潔化、型安全性の向上、およびメンテナンス性の改善を目指します。

## 最終計画概要

1. **依存関係の追加:** `@saintno/comfyui-sdk` をプロジェクトに追加します。
2. **旧関数の移動:** 現在の API 通信およびワークフロー構築ロジックを別ファイル (`src/services/api_legacy.ts`) に退避させます。
3. **`src/services/api.ts` の書き換え:** SDK の機能 (`ComfyApi`, `PromptBuilder`, `CallWrapper`) を利用して API 通信部分を再実装します。
4. **テスト:** 変更後の画像生成および動画生成機能が正しく動作することを確認します。

## 詳細計画

### 1. 依存関係の追加

* `package.json` の `dependencies` または `devDependencies` に `@saintno/comfyui-sdk` を追加します。
* 以下のコマンドを実行して SDK をインストールします。

    ```bash
    npm install @saintno/comfyui-sdk
    # または
    yarn add @saintno/comfyui-sdk
    ```

### 2. 旧関数の移動

* 新しいファイル `src/services/api_legacy.ts` を作成します。
* `src/services/api.ts` から以下の関数および関連する型定義を `src/services/api_legacy.ts` にカット＆ペーストします。
  * `buildWorkflow`
  * `buildVideoWorkflow`
  * `waitForProcessing`
  * `waitForVideoProcessing`
  * 関連するヘルパー型定義 (例: `WorkflowInput`, `WorkflowNode`, `WorkflowLink`, `ApiNodeInputs`, `ApiWorkflow`)
* `src/services/api_legacy.ts` 内で、移動したコードが必要とするインポート文 (`axios`, `ComfyUIParams`, `VideoGenerationParams`, `videoWorkflowTemplate.json` など) を追加・調整します。必要に応じて `export` キーワードを追加します (ただし、これらの関数は `api.ts` からは使用されません)。

### 3. `src/services/api.ts` の書き換え

* **SDK のインポート:**

    ```typescript
    import { ComfyApi, PromptBuilder, CallWrapper, seed, /* 他の必要な型 (TSamplerName, TSchedulerName など) */ } from "@saintno/comfyui-sdk";
    import axios from "axios"; // checkStatus で一時的に残すか、完全に SDK に移行するか検討
    import { ComfyUIParams, ApiResponse, GenerationResult } from "../types"; // これらの型は SDK の型に合わせて調整が必要
    import { useAppStore } from "../store/useAppStore";
    import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";
    import videoWorkflowTemplate from "./videoWorkflowTemplate.json";
    ```

* **`ComfyApi` インスタンスの準備:**

    ```typescript
    let comfyApiInstance: ComfyApi | null = null;

    const getComfyApi = (): ComfyApi => {
      const { apiUrl } = useAppStore.getState();
      if (!apiUrl) {
        throw new Error("ComfyUI API URL is not configured.");
      }
      // API URL が変更された場合にインスタンスを再作成するロジックを検討
      if (!comfyApiInstance || comfyApiInstance.api_host !== apiUrl) {
         const clientId = `comfy-sd-react-${Date.now()}`; // WebSocket 用の一意 ID
         comfyApiInstance = new ComfyApi(apiUrl, clientId);
         // 必要に応じて初期化 (接続確認など)
         // comfyApiInstance.init().catch(console.error);
      }
      return comfyApiInstance;
    };
    ```

* **`checkStatus` 関数の書き換え:**

    ```typescript
    async checkStatus(): Promise<ApiResponse> {
      try {
        const api = getComfyApi();
        // pollStatus は接続を確認し、準備完了を待つ可能性があります
        await api.pollStatus(5000); // タイムアウトを5秒に設定 (例)
        // または getSystemStats() を使用
        // const stats = await api.getSystemStats();
        return { status: "success", data: { message: "接続成功" } }; // SDK の応答に応じて調整
      } catch (error) {
        console.error("APIステータスの確認に失敗しました", error);
        const errorMessage = error instanceof Error ? error.message : "不明な接続エラー";
        return {
          status: "error",
          error: `接続に失敗しました: ${errorMessage}`,
        };
      }
    },
    ```

* **`processImage` 関数の書き換え:**
  * 画像アップロード: `api.uploadImage(imageFile, imageFile.name, { override: true })` を使用。
  * ワークフロー構築: `PromptBuilder` を使用して Image-to-Image ワークフローを定義。

    ```typescript
        // 例: シンプルな I2I ワークフロー
        const i2iInputKeys = ["ckpt_name", "positive", "negative", "imagePath", "seed", "steps", "cfg", "sampler_name", "scheduler", "denoise"] as const;
        const i2iOutputKeys = ["generatedImage"] as const;
        // ワークフローJSONを別途定義するか、PromptBuilderで動的に構築
        const i2iWorkflow = { /* ... シンプルなI2Iワークフロー定義 ... */ }; // buildWorkflow の内容を元に作成
        const builder = new PromptBuilder<typeof i2iInputKeys, typeof i2iOutputKeys, typeof i2iWorkflow>(
            i2iWorkflow, i2iInputKeys, i2iOutputKeys
        );
        builder
            .setInputNode("ckpt_name", "1.inputs.ckpt_name") // ノードIDは実際のワークフローに合わせる
            .setInputNode("positive", "2.inputs.text")
            .setInputNode("negative", "3.inputs.text")
            .setInputNode("imagePath", "4.inputs.image")
            .setInputNode("seed", "6.inputs.seed")
            // ... 他のマッピング
            .setOutputNode("generatedImage", "8"); // SaveImage ノード
    ```

  * 実行と結果処理: `CallWrapper` を使用。

    ```typescript
        const workflowInstance = builder.clone();
        workflowInstance
            .input("ckpt_name", "v1-5-pruned-emaonly-fp16.safetensors") // 例
            .input("positive", params.prompt)
            .input("negative", params.negativePrompt)
            .input("imagePath", uploadedImagePath)
            .input("seed", params.seed < 0 ? seed() : params.seed)
            // ... 他のパラメータ設定
            .input("denoise", params.denoiseStrength);

        return new Promise<ApiResponse>((resolve, reject) => {
            new CallWrapper(api, workflowInstance)
                .onProgress(onProgress) // 進捗コールバックを渡す
                .onFinished((data) => {
                    const imageInfo = data.generatedImage?.images?.[0];
                    if (imageInfo) {
                        const imageUrl = api.getPathImage(imageInfo);
                        const generationResult: GenerationResult = { /* ... */ };
                        resolve({ status: "success", data: generationResult });
                    } else {
                        reject("生成された画像が見つかりませんでした。");
                    }
                })
                .onFailed((error) => {
                    console.error("画像処理に失敗しました (SDK)", error);
                    reject(`画像処理エラー: ${error.message}`);
                })
                .run();
        });
    ```

* **`generateVideo` 関数の書き換え:**
  * 画像アップロード: `api.uploadImage()` を使用。
  * ワークフロー構築: `PromptBuilder` に `videoWorkflowTemplate.json` をロードし、マッピングとパラメータ設定を行う (前回の計画通り)。

```typescript
        const videoInputKeys = [/* ... */] as const;
        const videoOutputKeys = ["videoOutput"] as const;
        const builder = new PromptBuilder<typeof videoInputKeys, typeof videoOutputKeys, typeof videoWorkflowTemplate>(
            videoWorkflowTemplate, videoInputKeys, videoOutputKeys
        );
        builder
            .setInputNode("imagePath", "19.inputs.image")
            .setInputNode("prompt", "47.inputs.text")
            // ... 他のマッピング
            .setOutputNode("videoOutput", "23"); // VHS_VideoCombine

        const workflowInstance = builder.clone();
        workflowInstance
            .input("imagePath", uploadedImagePath)
            .input("prompt", prompt)
            .input("steps", videoParams.steps)
            // ... 他のパラメータ設定
            .input("seed", videoParams.seed < 0 ? seed() : videoParams.seed);
        ```

  * 実行と結果処理: `CallWrapper` を使用 (上記 `processImage` と同様の構造)。`onFinished` で `data.videoOutput` から動画情報を取得し、URL を構築する。
* **型の調整:** `ApiResponse`, `GenerationResult` などの型定義を、SDK が返すデータ構造に合わせて見直します。特に `GenerationResult` の `imageUrl` は動画の場合 `videoUrl` など、より適切な名前に変更することも検討します。

### 4. テスト

* **接続確認:** API URL 設定後のステータスチェックが正しく動作するか。
* **画像生成:**
  * 基本的な Text-to-Image / Image-to-Image が成功するか。
  * 各種パラメータ (プロンプト、ステップ数、CFG スケール、サンプラーなど) が反映されるか。
  * 進捗表示が正しく更新されるか。
  * 生成結果の画像が正しく表示されるか。
  * エラー発生時に適切なメッセージが表示されるか。
* **動画生成:**
  * 基本的な Image-to-Video が成功するか。
  * 各種パラメータ (プロンプト、ステップ数、モーション強度、FPS など) が反映されるか。
  * 進捗表示が正しく更新されるか。
  * 生成結果の動画が正しく表示またはダウンロードできるか。
  * エラー発生時に適切なメッセージが表示されるか。

## 処理フローの変化 (イメージ)

```mermaid
graph TD
    subgraph 現状の処理フロー (例: processImage)
        A[UI] --> B(axios: uploadImage);
        B --> C(buildWorkflow);
        C --> D(axios: prompt);
        D --> E(WebSocket: /ws);
        E -- progress --> A;
        E -- done --> F(axios: history);
        F --> G[Result URL];
        G --> A;
        B & D & E & F -- error --> A;
    end

    subgraph SDKを使った処理フロー (例: processImage)
        AA[UI] --> BB(ComfyApi: uploadImage);
        BB --> CC(PromptBuilder);
        CC --> DD(CallWrapper);
        DD -- .input() --> DD;
        DD -- .run() --> EE(ComfyApi: prompt & /ws);
        EE -- onProgress --> AA;
        EE -- onFinished --> FF[Result Data];
        FF -- ComfyApi: getPathImage --> GG[Result URL];
        GG --> AA;
        BB & EE -- error/onFailed --> AA;
    end
