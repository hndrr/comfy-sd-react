import React from "react";
import { useAppStore } from "../store/useAppStore";

const ProgressBar: React.FC = () => {
  const progress = useAppStore((state) => state.progress);
  console.log("ProgressBar received progress:", progress); // progress 値をログ出力

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
