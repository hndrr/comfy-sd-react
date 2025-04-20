import React from "react";
import { Moon, Sun, Image, Settings } from "lucide-react"; // Settings をインポート
import { useAppStore } from "../store/useAppStore";

const Header: React.FC = () => {
  const { darkMode, toggleDarkMode, toggleConnectionSettings } = useAppStore(); // toggleConnectionSettings を取得

  return (
    <header className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Image size={24} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            ComfyUI React
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleConnectionSettings} // パネルを開閉する関数を呼び出す
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="接続設定を開く"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={
              darkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"
            }
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
