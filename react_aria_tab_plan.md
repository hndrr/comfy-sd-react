# 動画生成機能タブ化計画 (React Aria + Tailwind CSS)

## 目的

画像生成機能と動画生成機能をタブで切り替えられるように UI を変更する。

## 使用技術

* React
* Tailwind CSS
* React Aria (`react-aria-components`)

## 計画

1. **React Aria のインストール:**
    * `npm install react-aria-components` または `yarn add react-aria-components` を実行して、必要なパッケージをプロジェクトに追加します。

2. **タブコンポーネントの作成 (`src/components/GenerationTabs.tsx`):**
    * `react-aria-components` から `Tabs`, `TabList`, `Tab`, `TabPanel` をインポートします。
    * これらのコンポーネントを使用して、タブ UI の基本構造を構築します。
    * `TabList` 内に "画像生成" と "動画生成" の `Tab` を作成します。
    * 各 `Tab` に対応する `TabPanel` を作成します。
    * "画像生成" の `TabPanel` 内に `GenerationPanel` コンポーネントを配置します。
    * "動画生成" の `TabPanel` 内に `VideoGenerationPanel` コンポーネントを配置します。
    * Tailwind CSS を使用して、`Tabs`, `TabList`, `Tab`, `TabPanel` にスタイルを適用し、視覚的なデザインを整えます。 (例: 選択中のタブの強調、パネルの境界線など)

3. **`App.tsx` の更新:**
    * `src/App.tsx` を編集します。
    * 既存の `GenerationPanel` と `VideoGenerationPanel` の直接レンダリング部分を削除します。
    * 新しく作成した `GenerationTabs` コンポーネントをインポートし、削除した箇所に配置します。

## コンポーネント構成案 (Mermaid)

```mermaid
graph TD
    subgraph App.tsx
        App --> GenerationTabs
    end

    subgraph GenerationTabs.tsx (using react-aria-components)
        GenerationTabs --> Tabs[Tabs]
        Tabs --> TabList[TabList]
        TabList --> TabImage[Tab "画像生成"]
        TabList --> TabVideo[Tab "動画生成"]
        Tabs --> TabPanelImage[TabPanel (Image)]
        Tabs --> TabPanelVideo[TabPanel (Video)]
        TabPanelImage --> GenerationPanel(画像生成)
        TabPanelVideo --> VideoGenerationPanel(動画生成)
    end

    style App fill:#f9f,stroke:#333,stroke-width:2px
    style GenerationTabs fill:#ccf,stroke:#333,stroke-width:1px
    style GenerationPanel fill:#cfc,stroke:#333,stroke-width:1px
    style VideoGenerationPanel fill:#cfc,stroke:#333,stroke-width:1px
```

## 次のステップ

1. Code モードに切り替える。
2. `react-aria-components` をインストールする。
3. `src/components/GenerationTabs.tsx` を作成し、タブ UI を実装する。
4. `src/App.tsx` を更新して `GenerationTabs` を使用するように変更する。