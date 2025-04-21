import React from "react";
import { useAppStore } from "../store/useAppStore";

const ProgressBar: React.FC = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const imageProgress = useAppStore((state) => state.progress);
  const videoProgress = useAppStore((state) => state.videoProgress);

  // 表示するタブに応じて進捗を選択
  const progress = activeTab === "video" ? videoProgress : imageProgress;

  console.log(`ProgressBar (${activeTab}) received progress:`, progress); // ログにタブ情報を追加

  // progress が null または 0 未満、1 より大きい場合は表示しない
  if (progress === null || progress < 0 || progress > 1) {
    return null;
  }

  const percentage = Math.round(progress * 100);
  console.log("Calculated percentage:", percentage); // 計算されたパーセンテージをログ出力

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 my-4">
      <div
        className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-150 ease-linear"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="生成進捗"
      ></div>
      <span className="sr-only">{percentage}% Complete</span>{" "}
      {/* スクリーンリーダー用 */}
    </div>
  );
};

export default ProgressBar;
