# 接続設定UIをヘッダーメニューに移動する計画

## 目的

現在 `SettingsForm.tsx` 内にある「接続設定」（ComfyUI API URL）のUIを、ヘッダーのアイコンクリックで表示される右スライドインパネルに移動する。これにより、画像生成と動画生成の両方からアクセスしやすくなる。

## 技術選定

- UIコンポーネント: React Aria components (`Modal`, `ModalOverlay`, `Dialog`)
- 状態管理: Zustand (`useAppStore`)
- スタイリング: Tailwind CSS

## 更新後の計画

1. **状態管理の更新 (`src/store/useAppStore.ts`)**
    - 接続設定パネルの表示状態を管理する `isConnectionSettingsOpen` (boolean) を追加。初期値は `false`。
    - `isConnectionSettingsOpen` の状態を切り替える `toggleConnectionSettings` 関数を追加。

2. **`ConnectionSettingsPanel.tsx` の新規作成 (`src/components/ConnectionSettingsPanel.tsx`)**
    - React Aria の `Modal`, `ModalOverlay`, `Dialog` を使用してパネルの基本構造を作成。
    - `ModalOverlay` を使用し、背景クリックで閉じられるように (`isDismissable`) 設定。
    - `Dialog` 内に、`SettingsForm.tsx` から移動した API URL の入力フィールド、ラベル、説明文を配置。
    - `useAppStore` から `apiUrl`, `setApiUrl`, `isConnectionSettingsOpen`, `toggleConnectionSettings` を取得して使用。
    - パネルを閉じるためのボタン（例: 右上に×ボタン）を追加し、`onClick` で `toggleConnectionSettings` を呼び出す。
    - Tailwind CSS を使用して、右からスライドイン・アウトするアニメーションとパネルのスタイルを適用。

3. **`Header.tsx` の変更 (`src/components/Header.tsx`)**
    - `lucide-react` から `Settings` アイコンをインポート。
    - ダークモード切り替えボタンの隣などに、`Settings` アイコンを使ったボタンを追加。
    - このボタンの `onClick` イベントハンドラで `useAppStore` の `toggleConnectionSettings` を呼び出すようにする。

4. **`App.tsx` (または適切なルートレベルのコンポーネント) の変更**
    - `useAppStore` から `isConnectionSettingsOpen` を取得。
    - `isConnectionSettingsOpen` が `true` の場合に `ConnectionSettingsPanel` コンポーネントをレンダリングするようにする。（React Aria Modalのため）

5. **`SettingsForm.tsx` の変更 (`src/components/SettingsForm.tsx`)**
    - 接続設定を表示するためのボタン（元のコードの212〜219行目）を削除。
    - `showSettings` 状態に応じた条件レンダリング部分（元のコードの221〜243行目）を削除。
    - 関連する `useState` (`showSettings`) を削除。

## コンポーネント連携イメージ (Mermaid図)

```mermaid
graph TD
    subgraph Header Area
        A[Header.tsx] -- クリック --> B(設定アイコンボタン);
    end

    subgraph App Root Area
        H[App.tsx] -- isConnectionSettingsOpen=true --> I(ConnectionSettingsPanel.tsx);
    end

    subgraph Panel Area (React Aria)
        I -- 表示/非表示 (Modal/Dialog) --> J(右スライドインパネル);
        I -- API URL入力 --> E(useAppStore);
        I -- 閉じるボタン/オーバーレイクリック --> E;
    end

    subgraph State Management (useAppStore)
        E -- isConnectionSettingsOpen, toggleConnectionSettings --> H;
        E -- isConnectionSettingsOpen, toggleConnectionSettings --> I;
        E -- apiUrl, setApiUrl --> I;
    end

    subgraph Original Location (Removed)
        F[SettingsForm.tsx] -- 接続設定UI削除 --> G(生成パラメータのみ);
    end

    B -- クリック --> E[呼び出し: toggleConnectionSettings];