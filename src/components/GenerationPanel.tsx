import { AlertTriangle, Loader, Play } from "lucide-react";
import React, { useState } from "react"; // useState をインポート
import { comfyUIApi } from "../services/api";
import { enhanceText } from "../services/enhanceTextService"; // enhanceText をインポート
import { useAppStore } from "../store/useAppStore";
import { GenerationResult } from "../types";
import ImageUploader from "./ImageUploader";
import ProgressBar from "./ProgressBar";
import PromptInput from "./PromptInput";
import SettingsForm from "./SettingsForm";

const GenerationPanel: React.FC = () => {
  const {
    sourceImage,
    prompt,
    params,
    isGenerating,
    setIsGenerating,
    addResult,
    setError, // 既存のエラー処理も活用
    setProgress,
    setPrompt,
    updateParams,
    // ストアから imageEnhanceSystemPrompt を直接取得
    imageEnhanceSystemPrompt,
  } = useAppStore();

  const [connectionStatus, setConnectionStatus] = useState<
    "unknown" | "connected" | "error"
  >("unknown");

  // プロンプト拡張用の状態を追加
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  // APIの接続状態を確認
  const checkConnection = async () => {
    const result = await comfyUIApi.checkStatus();
    if (result.status === "success") {
      setConnectionStatus("connected");
      setError(null); // 接続成功時に既存のエラーをクリア
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
    setError(null); // 生成開始時にエラーをクリア

    try {
      // 現在のプロンプトをパラメータに含める
      const currentParams = { ...params, prompt: prompt };

      const result = await comfyUIApi.processImage(
        sourceImage.file,
        currentParams, // 更新されたパラメータを使用
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
      setError(
        error instanceof Error
          ? error.message
          : "画像生成中に不明なエラーが発生しました。"
      ); // エラーメッセージをより具体的に
      console.error("Image generation failed:", error); // コンソールにもエラー出力
    } finally {
      setIsGenerating(false);
    }
  };

  // プロンプト拡張を実行
  const handleEnhance = async () => {
    const currentSourceImageFile = sourceImage.file;
    const currentPrompt = prompt.trim();

    // プロンプトも画像もない場合はエラー
    if (!currentPrompt && !currentSourceImageFile) {
      setEnhanceError("拡張するプロンプトを入力するか、画像をアップロードしてください。");
      return;
    }

    setIsEnhancing(true);
    setEnhanceError(null);
    setError(null); // 拡張開始時に既存のエラーをクリア

    try {
      // プロンプトが空で画像がある場合は、画像の説明を生成するような指示を追加することも検討
      // ここでは既存の systemPrompt をそのまま使用
      const enhancedPrompt = await enhanceText(
        currentPrompt, // 空文字列の場合もある
        imageEnhanceSystemPrompt,
        currentSourceImageFile
      );
      setPrompt(enhancedPrompt);
    } catch (error) {
      console.error("Prompt enhancement failed:", error);
      setEnhanceError(
        error instanceof Error
          ? `拡張エラー: ${error.message}`
          : "プロンプトの拡張中に不明なエラーが発生しました。"
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-6">
      {connectionStatus === "connected" && (
        <div className="flex items-center justify-end space-x-2">
          <span className="flex items-center text-sm text-green-600 dark:text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
            接続済み
          </span>
        </div>
      )}
      {connectionStatus === "error" && (
        <div className="flex items-center justify-end space-x-2">
          <span className="flex items-center text-sm text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="mr-1" />
            接続エラー
          </span>
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Image Generation
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploader imageType="image" />
        <div className="space-y-6">
          {/* PromptInput に拡張関連の props を渡す */}
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            placeholder="Describe the image you want to generate..."
            onEnhance={handleEnhance}
            isEnhancing={isEnhancing}
            enhanceError={enhanceError}
          />
          <div>
            <label
              htmlFor="negativePromptPanel" // IDを他と区別
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              ネガティブプロンプト
            </label>
            <textarea
              id="negativePromptPanel"
              rows={2}
              value={params.negativePrompt}
              onChange={(e) => updateParams({ negativePrompt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="避けたい特徴を入力してください..."
            />
          </div>
          <SettingsForm />
          <div className="text-center">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !sourceImage.file || isEnhancing} // 拡張中も生成ボタンを無効化
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                isGenerating || !sourceImage.file || isEnhancing // 条件追加
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
        </div>
      </div>
    </div>
  );
};

export default GenerationPanel;
