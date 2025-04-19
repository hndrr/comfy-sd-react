import React, { useEffect } from "react";
import { useAppStore } from "./store/useAppStore";
import Header from "./components/Header";
import ImageUploader from "./components/ImageUploader";
import SettingsForm from "./components/SettingsForm";
import GenerationPanel from "./components/GenerationPanel"; // 画像生成用
import VideoGenerationPanel from "./components/VideoGenerationPanel"; // 動画生成用 (追加)
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-8">
            <ImageUploader imageType="image" /> {/* imageType を指定 */}
            <GenerationPanel /> {/* 画像生成 */}
            <VideoGenerationPanel /> {/* 動画生成 (追加) */}
          </div>

          <div>
            <SettingsForm />
          </div>
        </div>

        <ResultsGallery />
      </main>

      <ErrorAlert />
    </div>
  );
}

export default App;
