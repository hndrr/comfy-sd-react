# 動画生成結果をギャラリーに追加する計画

## 目的

画像生成結果と同様に、動画生成の結果も ResultsGallery コンポーネントに表示し、管理できるようにする。

## 計画概要

1. **型定義の明確化 (`src/types/index.ts`)**: `GenerationResult` 型を更新し、画像と動画の結果を明確に区別できるようにする。
2. **ストアのロジック変更 (`src/store/useAppStore.ts`)**: 動画生成完了時に、結果を `results` 配列に一元的に追加するように変更する。
3. **UIコンポーネントの修正 (`src/components/ResultsGallery.tsx`)**: `ResultItem` コンポーネントを更新し、結果のタイプに応じて画像または動画（サムネイル＋モーダル再生）を表示し、適切なアクションを提供できるようにする。
4. **API連携部分の確認/修正 (`src/services/api.ts` など)**: 動画生成APIのレスポンスから必要な情報（動画URL、サムネイルURL）を取得し、ストア更新処理を実装する。

## 詳細計画

### 1. 型定義の明確化 (`src/types/index.ts`)

* `GenerationResult` インターフェースを以下のように修正する:
  * `type` フィールドを必須にする (`type: "image" | "video";`)。
  * `imageUrl` は画像専用とする (`imageUrl?: string;`)。
  * 動画用に `videoUrl: string;` フィールドを追加する。
  * 動画のサムネイル用に `thumbnailUrl?: string;` フィールドを追加する（APIから取得可能な場合）。

```typescript
export interface GenerationResult {
  id: string;
  prompt: string; // 生成に使用したプロンプト
  params: ComfyUIParams | VideoGenerationParams; // 画像または動画パラメータ
  timestamp: number;
  type: "image" | "video"; // 結果のタイプ (必須)
  imageUrl?: string; // 画像の場合のURL
  videoUrl?: string; // 動画の場合のURL
  thumbnailUrl?: string; // 動画のサムネイルURL (オプション)
}
```

### 2. ストアのロジック変更 (`src/store/useAppStore.ts`)

* `addResult` アクション:
  * 受け取る `result` オブジェクトに必ず `type` が含まれることを前提とする。型定義の変更により、これは保証される。
* 動画生成完了時の処理 (API呼び出し成功後):
  * 現在の `setGeneratedVideoUrl` アクションや関連ロジックを修正する。
  * APIレスポンスから `videoUrl` と `thumbnailUrl` (あれば) を取得する。
  * 以下の情報を含む `GenerationResult` オブジェクトを作成する:
    * `id`: ユニークなID (例: `Date.now().toString()`)
    * `prompt`: 使用した動画プロンプト (`state.videoPrompt`)
    * `params`: 使用した動画生成パラメータ (`state.videoGenerationParams`)
    * `timestamp`: 現在時刻 (`Date.now()`)
    * `type`: `"video"`
    * `videoUrl`: APIから取得した動画URL
    * `thumbnailUrl`: APIから取得したサムネイルURL (あれば)
  * 作成した `GenerationResult` オブジェクトを `addResult(newResult)` で `results` 配列に追加する。
  * `isGeneratingVideo` を `false` に、`videoProgress` を `null` に設定する。
  * `generatedVideoUrl` state は不要になる可能性が高いので、関連する箇所を削除またはコメントアウトする。

### 3. UIコンポーネントの修正 (`src/components/ResultsGallery.tsx`)

* `ResultItem` コンポーネント:
  * Props で受け取る型を更新された `GenerationResult` に合わせる。
  * **表示**:
    * `result.type === "image"` の場合:
      * `<img>` タグで `result.imageUrl` を表示する。
    * `result.type === "video"` の場合:
      * `result.thumbnailUrl` が存在すれば、それを `<img>` タグで表示する。
      * `result.thumbnailUrl` がなければ、`<video>` タグで `result.videoUrl` を表示し、`preload="metadata"` などを利用して最初のフレームを表示するか、汎用のビデオアイコンなどのプレースホルダー画像を表示する。
      * 画像/動画要素に `cursor-pointer` を適用し、クリック可能であることを示す。
  * **アクション**:
    * **プレビュー (クリック時)**:
      * `result.type === "image"` の場合: 既存の `openPreviewModal(result.imageUrl)` を呼び出す。
      * `result.type === "video"` の場合: 新しいモーダルを開くか、既存のモーダルを拡張して `result.videoUrl` を `<video>` タグで再生する。モーダルを開くための新しいストアアクション (`openVideoPreviewModal(videoUrl)`) が必要になる可能性がある。
    * **ダウンロードボタン**:
      * `result.type === "image"` の場合: 既存の `downloadImage` ヘルパーを使用。
      * `result.type === "video"` の場合: `result.videoUrl` を使って動画ファイルをダウンロードする新しいヘルパー関数 (`downloadVideo`) を作成・使用する。ファイル名は `comfyui-video-${Date.now()}.mp4` のようにする。
    * **削除ボタン**:
      * `type` によらず、既存の `onDelete(result.id)` (内部で `removeResult` を呼ぶ) を使用する。
    * **ソースとして使用ボタン**:
      * `result.type === "image"` の場合: 既存のロジックを維持する。
      * `result.type === "video"` の場合: このボタン自体をレンダリングしない。

### 4. API連携部分の確認/修正 (`src/services/api.ts` など)

* 動画生成を実行する関数 (例: `generateVideo`) を修正する。
* ComfyUI APIなどのバックエンドからのレスポンス形式を確認する。
  * 生成された動画ファイルのURL (`/view` エンドポイントなど) を特定する。
  * 可能であれば、サムネイル画像のURLも取得できるか確認する (ComfyUIのワークフローによっては、プレビュー画像を別途生成・保存する必要があるかもしれない)。
* API呼び出しが成功し、動画URL (とサムネイルURL) が取得できたら、上記「2. ストアのロジック変更」で説明した手順に従って `addResult` アクションを呼び出す。
* エラーハンドリングも適切に行う (`setVideoError` などを使用)。

## Mermaid図

```mermaid
graph TD
    A[開始: 動画結果をギャラリーに追加] --> B(型定義の修正\nsrc/types/index.ts);
    B --> C(ストアロジック変更\nsrc/store/useAppStore.ts);
    C --> D(UIコンポーネント修正\nsrc/components/ResultsGallery.tsx);
    D --> E(API連携確認/修正\nsrc/services/api.ts);
    E --> F[完了];

    subgraph 型定義
        B1[GenerationResult に\ntype を必須化]
        B2[videoUrl フィールド追加]
        B3[thumbnailUrl? フィールド追加]
    end

    subgraph ストア
        C1[addResult で type を必須に]
        C2[動画生成完了時に\naddResult(type: video, videoUrl, thumbnailUrl?) を呼ぶ]
        C3[generatedVideoUrl state\nの扱い見直し]
    end

    subgraph UI (ResultItem)
        D1[type に応じた表示分岐\n(img vs thumbnail/video)]
        D2[動画用アクション実装\n(モーダル再生, DL, 削除)]
        D3[動画の「ソースとして使用」\nボタン非表示]
    end

    subgraph API
        E1[動画APIレスポンス確認\n(videoUrl, thumbnailUrl? 取得)]
        E2[動画生成完了時の\nストア更新処理追加]
    end

    B --> B1 & B2 & B3;
    C --> C1 & C2 & C3;
    D --> D1 & D2 & D3;
    E --> E1 & E2;
```

## 次のステップ

この計画に基づいて、`code` モードで実装を開始する。
