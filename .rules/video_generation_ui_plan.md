# ComfyUI 動画生成 React UI 構築計画

提供されたComfyUIワークフローJSONと既存のReactプロジェクト (`comfy-sd-react`) を基に、シンプルな動画生成UIを構築するための計画です。

**目標:** 入力画像アップロード、テキストプロンプト入力、主要なパラメータ（生成ステップ数、CFGスケールなど）の設定、動画生成実行、結果のプレビュー/ダウンロードができるUIを作成する。

**計画ステップ:**

1. **UIコンポーネントの設計と作成:**
    * **`VideoGenerationPanel.tsx` (新規作成):** 動画生成UI全体のコンテナ。
    * **`ImageUploader.tsx` (既存利用):** 入力画像アップロード。
    * **`PromptInput.tsx` (新規作成):** テキストプロンプト入力。
    * **`ParameterSettings.tsx` (新規作成):** 主要パラメータ設定 (Steps, CFG Scale, Motion Strength, FPS)。
    * **`GenerateButton.tsx` (新規作成):** 生成開始ボタン。
    * **`VideoPreview.tsx` (新規作成):** 動画プレビューとダウンロード。
    * **`ProgressBar.tsx` (既存利用):** 生成進捗表示。
    * **`ErrorAlert.tsx` (既存利用):** エラー表示。

2. **状態管理の拡張 (`src/store/useAppStore.ts`):**
    * 動画生成関連の状態 (`prompt`, `generationParams`, `isGeneratingVideo`, `generatedVideoUrl`, `videoError`) を追加。

3. **API連携の拡張 (`src/services/api.ts`):**
    * `generateVideo` 関数 (新規作成):
        * UIからの入力 (画像, プロンプト, パラメータ) を受け取る。
        * ワークフローJSONテンプレートを動的に更新。
        * ComfyUI API (`/prompt`) に送信。
        * (オプション) WebSocketで進捗と結果を取得。
        * エラーハンドリング。

4. **コンポーネントの統合と表示 (`src/App.tsx` など):**
    * `VideoGenerationPanel` を配置。
    * コンポーネントを状態管理ストアに接続。
    * 生成ボタンクリックでAPI呼び出し。
    * 進捗、結果、エラーを表示。

**コンポーネント構成図 (Mermaid):**

```mermaid
graph TD
    subgraph "React UI (comfy-sd-react)"
        App --> VGP(VideoGenerationPanel)
        VGP --> IU(ImageUploader)
        VGP --> PI(PromptInput)
        VGP --> PS(ParameterSettings)
        VGP --> GB(GenerateButton)
        VGP --> VP(VideoPreview)
        VGP --> PB(ProgressBar)
        VGP --> EA(ErrorAlert)
    end

    subgraph "State (Zustand Store)"
        Store(useAppStore)
        Store -- Manages --> InputImage
        Store -- Manages --> Prompt
        Store -- Manages --> Params
        Store -- Manages --> IsGenerating
        Store -- Manages --> VideoURL
        Store -- Manages --> Error
    end

    subgraph "API Service"
        API(api.ts) --> GenerateVideoFunc(generateVideo)
    end

    subgraph "Backend (ComfyUI)"
        ComfyAPI([ComfyUI API /prompt])
        ComfyWS([ComfyUI WebSocket])
    end

    VGP -- Reads/Updates --> Store

    IU -- Updates --> Store(InputImage)
    PI -- Updates --> Store(Prompt)
    PS -- Updates --> Store(Params)

    GB -- OnClick --> GenerateVideoFunc
    GenerateVideoFunc -- Reads --> Store(InputImage, Prompt, Params)
    GenerateVideoFunc -- Sends Workflow --> ComfyAPI
    GenerateVideoFunc -- Listens --> ComfyWS

    ComfyWS -- Sends Progress/Result/Error --> GenerateVideoFunc
    GenerateVideoFunc -- Updates --> Store(IsGenerating, VideoURL, Error)

    VP -- Reads --> Store(VideoURL)
    PB -- Reads --> Store(IsGenerating, Progress from WS)
    EA -- Reads --> Store(Error)