# プロンプト拡張機能 実装計画

## 概要

Reactアプリケーションにプロンプト拡張機能を追加する。画像生成 (`GenerationPanel.tsx`) と動画生成 (`VideoGenerationPanel.tsx`) の両方で利用可能にし、既存の `enhanceTextService.ts` を活用する。

## 計画詳細

1. **`src/components/PromptInput.tsx` の拡張:**
    * プロンプト拡張を実行するためのボタン（例：「✨ 拡張」）をテキストエリアの下に追加する。
    * `PromptInputProps` インターフェースに以下のプロパティを追加する:
        * `onEnhance?: () => Promise<void>;` : 拡張ボタンがクリックされたときに呼び出される非同期関数。
        * `isEnhancing?: boolean;` : 拡張処理が実行中かどうかを示すフラグ。
        * `enhanceError?: string | null;` : 拡張処理中に発生したエラーメッセージ。
    * ボタンの `onClick` イベントハンドラに `onEnhance` プロパティで受け取った関数を設定する。
    * `isEnhancing` が `true` の場合、ボタンを無効化し、ローディングアイコン（例：スピナー）を表示する。
    * `enhanceError` に値がある場合、ボタンの近くにエラーメッセージを表示する（例：赤色のテキスト）。

2. **`systemPrompt` の定義:**
    * 画像生成用と動画生成用の `systemPrompt` を定義する。これらは、新しい設定ファイル（例：`src/config/prompts.ts`）または各パネルコンポーネント内の定数として管理する。
    * **例 (`src/config/prompts.ts`):**

        ```typescript
        export const IMAGE_ENHANCE_SYSTEM_PROMPT = "Provide a more detailed and visually rich description for image generation based on the following input:";
        export const VIDEO_ENHANCE_SYSTEM_PROMPT = "Expand the following input into a prompt suitable for video generation, incorporating elements of motion, camera angles, and scene progression:";
        ```

3. **`src/components/GenerationPanel.tsx` (画像生成パネル) の改修:**
    * `React.useState` を使用して、以下のローカル状態を追加する:
        * `isEnhancing` (初期値: `false`)
        * `enhanceError` (初期値: `null`)
    * `handleEnhance` という名前の非同期関数を作成する:
        * 処理開始時に `setIsEnhancing(true)` と `setEnhanceError(null)` を呼び出す。
        * `try...catch` ブロック内で `enhanceTextService.enhanceText(prompt, IMAGE_ENHANCE_SYSTEM_PROMPT)` を呼び出す。
        * 成功した場合、返却された拡張テキストで `setPrompt` を呼び出してプロンプト状態を更新する。
        * エラーが発生した場合、`setEnhanceError` を呼び出してエラーメッセージを設定する。
        * `finally` ブロックで `setIsEnhancing(false)` を呼び出す。
    * レンダリング部分で `<PromptInput>` コンポーネントに以下のプロパティを渡す:
        * `onEnhance={handleEnhance}`
        * `isEnhancing={isEnhancing}`
        * `enhanceError={enhanceError}`

4. **`src/components/VideoGenerationPanel.tsx` (動画生成パネル) の改修:**
    * `GenerationPanel.tsx` と同様に、`isEnhancing` と `enhanceError` のローカル状態、および `handleEnhance` 非同期関数を追加する。
    * `handleEnhance` 関数内では、`enhanceTextService.enhanceText` を呼び出す際に `VIDEO_ENHANCE_SYSTEM_PROMPT` を使用する。
    * 成功した場合、返却された拡張テキストで `setVideoPrompt` を呼び出して動画プロンプト状態を更新する。
    * レンダリング部分で `<PromptInput>` コンポーネントに同様のプロパティ (`onEnhance`, `isEnhancing`, `enhanceError`) を渡す。

## コンポーネント連携 (Mermaid ダイアグラム)

```mermaid
graph TD
    subgraph GenerationPanel [画像生成パネル]
        direction LR
        GP_State[ローカル状態<br/>(prompt, isEnhancing, enhanceError)] --- GP_EnhanceLogic{拡張ロジック}
        GP_EnhanceLogic ---|画像用SystemPrompt| EnhanceService(enhanceTextService)
        GP_EnhanceLogic --- GP_PromptInput(PromptInput)
        GP_State -.-> GP_PromptInput
        EnhanceService -- 結果/エラー --> GP_EnhanceLogic
        GP_EnhanceLogic -- 更新/エラー設定 --> GP_State
    end

    subgraph VideoGenerationPanel [動画生成パネル]
        direction LR
        VGP_State[ローカル状態<br/>(videoPrompt, isEnhancing, enhanceError)] --- VGP_EnhanceLogic{拡張ロジック}
        VGP_EnhanceLogic ---|動画用SystemPrompt| EnhanceService
        VGP_EnhanceLogic --- VGP_PromptInput(PromptInput)
        VGP_State -.-> VGP_PromptInput
        EnhanceService -- 結果/エラー --> VGP_EnhanceLogic
        VGP_EnhanceLogic -- 更新/エラー設定 --> VGP_State
    end

    subgraph Shared [共有コンポーネント]
        PromptInputComp(PromptInput Component)
        EnhanceService
    end

    GP_PromptInput -- 実体 --> PromptInputComp
    VGP_PromptInput -- 実体 --> PromptInputComp

    style GP_PromptInput fill:#f9f,stroke:#333,stroke-width:2px
    style VGP_PromptInput fill:#f9f,stroke:#333,stroke-width:2px
```

## エラーハンドリング

* OpenAI API 呼び出し時のネットワークエラーや API 自体のエラーは `catch` ブロックで捕捉し、`enhanceError` 状態に設定する。
* `enhanceError` 状態にメッセージが存在する場合、`PromptInput` コンポーネント内（または既存の `ErrorAlert` コンポーネントを利用してパネル上部）にユーザーフレンドリーなエラーメッセージを表示する。

## 処理中表示

* `isEnhancing` 状態が `true` の間、`PromptInput` 内の拡張ボタンを無効化し、ローディングインジケーターを表示して、ユーザーに処理中であることを明確に伝える。
