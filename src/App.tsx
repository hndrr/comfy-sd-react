import React, { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import Header from "./components/Header";
// import ImageUploader from "./components/ImageUploader"; // 削除
// import SettingsForm from "./components/SettingsForm"; // 削除
import GenerationTabs from "./components/GenerationTabs"; // タブコンポーネント
import ResultsGallery from "./components/ResultsGallery";
import ErrorAlert from "./components/ErrorAlert";

function App() {
  const { darkMode } = useAppStore();

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
    </div>
  );
}

export default App;
