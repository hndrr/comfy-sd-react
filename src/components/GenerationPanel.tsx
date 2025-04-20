import React, { useState } from "react";
import { Play, AlertTriangle, Loader } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { comfyUIApi } from "../services/api";
import ProgressBar from "./ProgressBar";
import { GenerationResult } from "../types";
import ImageUploader from "./ImageUploader"; // 追加
import PromptInput from "./PromptInput"; // 追加
import SettingsForm from "./SettingsForm"; // 追加

const GenerationPanel: React.FC = () => {
  const {
    sourceImage, // 画像生成用ソース画像
    prompt, // 画像生成用プロンプト (追加)
    params, // 画像生成用パラメータ
    isGenerating,
    setIsGenerating,
    addResult,
    setError,
    setProgress,
    setPrompt, // 画像生成用プロンプト設定 (追加)
    updateParams, // 名前をストアに合わせて変更 (setParams -> updateParams)
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
      const result = await comfyUIApi.processImage(
        sourceImage.file,
        params,
        setProgress
      );

      // processImage が GenerationResult を返すように変更されたため、data の型をチェック
      // 型ガードを追加して result.data が GenerationResult であることを確認
      if (
        result.status === "success" &&
        typeof result.data === "object" &&
        result.data !== null &&
        "id" in result.data &&
        typeof result.data.id === "string" && // Check for GenerationResult properties
        "imageUrl" in result.data &&
        typeof result.data.imageUrl === "string" &&
        "prompt" in result.data &&
        typeof result.data.prompt === "string" &&
        "params" in result.data &&
        typeof result.data.params === "object" && // Basic object check for params
        "timestamp" in result.data &&
        typeof result.data.timestamp === "number"
      ) {
        // result.data が GenerationResult 型であることが保証された
        const generationData = result.data as GenerationResult; // 型アサーション

        // 結果を保存
        addResult({
          id: generationData.id,
          imageUrl: generationData.imageUrl,
          prompt: generationData.prompt,
          params: generationData.params, // params は ComfyUIParams | VideoGenerationParams
          timestamp: generationData.timestamp,
          type: "image",
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
    <div className="space-y-6">
      {" "}
      {/* space-y を追加 */}
      {/* 接続状態表示 (オプション) */}
      <div className="flex items-center justify-end space-x-2">
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
      {/* 1. Image Upload */}
      <ImageUploader imageType="image" /> {/* imageType を指定 */}
      {/* 2. Prompt Input */}
      <PromptInput prompt={prompt} setPrompt={setPrompt} />
      {/* 3. Parameter Settings */}
      {/* SettingsForm は params と setParams を内部で useAppStore から取得するため、props は不要 */}
      <SettingsForm />
      {/* 4. Generate Button */}
      <div className="text-center">
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
      </div>
      {/* 5. Progress Bar */}
      {isGenerating && <ProgressBar />}
      {/* パラメータ表示 (オプション) */}
      {/* <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        ノイズ強度: {params.denoiseStrength.toFixed(2)} | ステップ:{" "}
        {params.steps} | CFG: {params.cfg.toFixed(1)} | サンプラー:{" "}
        {params.sampler}
      </p> */}
    </div>
  );
};

export default GenerationPanel;
