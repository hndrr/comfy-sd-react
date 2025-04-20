import { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import Header from "./components/Header";
import GenerationTabs from "./components/GenerationTabs"; // タブコンポーネント
import ResultsGallery from "./components/ResultsGallery";
import ErrorAlert from "./components/ErrorAlert";
import { ConnectionSettingsPanel } from "./components/ConnectionSettingsPanel"; // パネルをインポート
import { ImagePreviewModal } from "./components/ImagePreviewModal"; // 画像プレビューモーダルをインポート

function App() {
  const {
    darkMode,
    isConnectionSettingsOpen,
    isPreviewModalOpen, // モーダル表示状態を取得
    previewImageUrl, // 表示する画像URLを取得
    closePreviewModal, // モーダルを閉じる関数を取得
  } = useAppStore();

  // デバッグ用 useEffect を削除

  // ダークモードの適用
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* レイアウトを簡略化: タブが主要コンテンツ */}
        <div className="mb-8">
          <GenerationTabs />
        </div>

        <ResultsGallery />
      </main>

      <ErrorAlert />

      {/* 接続設定パネルを条件付きでレンダリング */}
      {isConnectionSettingsOpen && <ConnectionSettingsPanel />}

      {/* 画像プレビューモーダルを条件付きでレンダリング */}
      <ImagePreviewModal
        isOpen={isPreviewModalOpen}
        imageUrl={previewImageUrl}
        onClose={closePreviewModal}
      />
    </div>
  );
}

export default App;
