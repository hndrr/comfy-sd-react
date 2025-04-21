# comfyui-react-client

これは [ComfyUI](https://github.com/comfyanonymous/ComfyUI) のための React ベースのフロントエンドクライアントです。画像生成や動画生成のインターフェース、生成結果のギャラリー表示、ComfyUI サーバーへの接続設定などの機能を提供します。

## 主な機能

* **画像生成インターフェース:** プロンプトや各種パラメータを設定して画像を生成します。
* **動画生成インターフェース:** 画像生成と同様のインターフェースで動画を生成します。
* **生成結果ギャラリー:** 生成された画像や動画を一覧表示し、プレビューできます。
* **ComfyUI サーバーへの接続設定:** アプリケーション内から ComfyUI サーバーのアドレスとポートを設定できます。
* **ダークモード対応:** システム設定や手動切り替えによるダークモード表示に対応しています。

## 使用技術

* [React](https://react.dev/)
* [Vite](https://vitejs.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Zustand](https://github.com/pmndrs/zustand)
* [Axios](https://axios-http.com/)
* [Lucide React](https://lucide.dev/)
* [React Aria Components](https://react-spectrum.adobe.com/react-aria/react-aria-components.html)

## セットアップと実行方法

### 前提条件

* [Node.js](https://nodejs.org/) (v18 以降推奨)
* [npm](https://www.npmjs.com/)

### 手順

1. **リポジトリをクローンします:**

    ```bash
    git clone https://github.com/your-username/comfyui-react-client.git
    cd comfyui-react-client
    ```

    *(注: 上記 URL は実際のプロジェクトリポジトリに合わせて変更してください)*

2. **依存関係をインストールします:**

    ```bash
    npm install
    ```

3. **開発サーバーを起動します:**

    ```bash
    npm run dev
    ```

    通常、`http://localhost:5173` でアプリケーションが開きます。

4. **(オプション) プロダクション用にビルドします:**

    ```bash
    npm run build
    ```

    ビルドされたファイルは `dist` ディレクトリに出力されます。

## 設定

1. アプリケーション右上の歯車アイコンをクリックして、接続設定パネルを開きます。
2. 実行中の ComfyUI サーバーの **API URL** を入力します。（例: `http://127.0.0.1:8188`）
3. 入力すると設定は自動的に保存されます。