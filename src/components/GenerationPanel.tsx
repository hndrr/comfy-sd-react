import React, { useState } from "react";
import { Play, AlertTriangle, Loader } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { comfyUIApi } from "../services/api";
import ProgressBar from "./ProgressBar";

const GenerationPanel: React.FC = () => {
  const {
    sourceImage,
    params,
    isGenerating,
    setIsGenerating,
    addResult,
    setError,
  } = useAppStore();

  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");

  // APIの接続状態を確認
  const checkConnection = async () => {
    const result = await comfyUIApi.checkStatus();
    if (result.status === "success") {
      setConnectionStatus("connected");
      setError(null);
      return true;
    } else {
      setConnectionStatus("error");
      setError(result.error || "APIとの接続に失敗しました。");
      return false;
    }
  };

  // 画像生成を実行
  const handleGenerate = async () => {
    if (!sourceImage.file) {
      setError("ソース画像をアップロードしてください。");
      return;
    }

    const isConnected = await checkConnection();
    if (!isConnected) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await comfyUIApi.processImage(sourceImage.file, params);

      if (result.status === "success" && result.data) {
        // 結果を保存
        addResult({
          id: Date.now().toString(),
          imageUrl: result.data,
          params: { ...params },
          timestamp: Date.now(),
        });
      } else {
        setError(result.error || "画像生成中にエラーが発生しました。");
      }
    } catch (error) {
      setError("画像生成中にエラーが発生しました。");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          画像生成
        </h2>

        <div className="flex items-center space-x-2">
          {connectionStatus === "connected" && (
            <span className="flex items-center text-sm text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
              接続済み
            </span>
          )}

          {connectionStatus === "error" && (
            <span className="flex items-center text-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="mr-1" />
              接続エラー
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !sourceImage.file}
        className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
          isGenerating || !sourceImage.file
            ? "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        }`}
      >
        {isGenerating ? (
          <>
            <Loader size={20} className="animate-spin" />
            <span>処理中...</span>
          </>
        ) : (
          <>
            <Play size={20} />
            <span>画像を生成</span>
          </>
        )}
      </button>

      {/* プログレスバー (生成中に表示) */}
      {isGenerating && <ProgressBar />}

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        ノイズ強度: {params.denoiseStrength.toFixed(2)} | ステップ:{" "}
        {params.steps} | CFG: {params.cfg.toFixed(1)} | サンプラー:{" "}
        {params.sampler}
      </p>
    </div>
  );
};

export default GenerationPanel;
