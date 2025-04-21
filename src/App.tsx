import { useEffect } from "react";
import { ConnectionSettingsPanel } from "./components/ConnectionSettingsPanel";
import ErrorAlert from "./components/ErrorAlert";
import GenerationTabs from "./components/GenerationTabs"; // タブコンポーネント
import Header from "./components/Header";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import ResultsGallery from "./components/ResultsGallery";
import VideoPreviewModal from "./components/VideoPreviewModal"; // 動画プレビューモーダルをインポート
// fetchModelLists アクションをインポート
import { useAppStore } from "./store/useAppStore";

function App() {
  const {
    darkMode,
    isConnectionSettingsOpen,
    isPreviewModalOpen,
    previewImageUrl,
    closePreviewModal,
    // fetchModelLists アクションを取得
    fetchModelLists,
  } = useAppStore();

  // ダークモードの適用
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // アプリ初期化時にモデルリストを取得
  useEffect(() => {
    fetchModelLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空の依存配列でマウント時に一度だけ実行

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
 
      {/* 動画プレビューモーダルをレンダリング */}
      <VideoPreviewModal />
    </div>
  );
}

export default App;
