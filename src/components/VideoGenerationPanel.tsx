import React, { useState } from "react"; // useState をインポート
import { comfyUIApi } from "../services/api";
import { enhanceText } from "../services/enhanceTextService"; // enhanceText をインポート
import { useAppStore } from "../store/useAppStore";
import { GenerationResult } from "../types";
import GenerateButton from "./GenerateButton";
import ImageUploader from "./ImageUploader";
import ParameterSettings from "./ParameterSettings";
import ProgressBar from "./ProgressBar";
import PromptInput from "./PromptInput";

const VideoGenerationPanel: React.FC = () => {
  const {
    videoSourceImage,
    videoPrompt,
    videoGenerationParams,
    isGeneratingVideo,
    setVideoPrompt,
    setVideoGenerationParams,
    setIsGeneratingVideo,
    setVideoProgress,
    addResult,
    setError, // 既存のエラー処理も活用
    // ストアから videoEnhanceSystemPrompt を直接取得
    videoEnhanceSystemPrompt,
  } = useAppStore();

  // プロンプト拡張用の状態を追加
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const handleGenerateClick = async () => {
    if (!videoSourceImage.file) {
      setError("Please select an image first."); // setError を使用
      return;
    }

    setIsGeneratingVideo(true);
    setError(null); // エラーをクリア
    setEnhanceError(null); // 拡張エラーもクリア

    try {
      const result = await comfyUIApi.generateVideo(
        videoSourceImage.file,
        videoPrompt,
        videoGenerationParams,
        setVideoProgress
      );

      // API レスポンスを処理
      if (result.status === "success" && result.data) {
        // result.data が GenerationResult 型であることを想定
        // (api.ts で型付けされているため、ここでは型ガードを簡略化)
        addResult(result.data as GenerationResult);
      } else {
        setError(
          result.error || "Failed to generate video or invalid data received."
        );
      }
    } catch (error) {
      console.error("Video generation failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during video generation."
      );
    } finally {
      // setIsGeneratingVideo(false); // finally でのセットは不要 (addResult or setError で処理される想定だが、念のためコメントアウト)
      // Note: isGeneratingVideo は addResult or setError 内で false に設定される想定
    }
  };

  // プロンプト拡張を実行
  const handleEnhance = async () => {
    const currentVideoSourceImageFile = videoSourceImage.file;
    const currentVideoPrompt = videoPrompt.trim();

    // プロンプトも画像もない場合はエラー
    if (!currentVideoPrompt && !currentVideoSourceImageFile) {
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
        currentVideoPrompt, // 空文字列の場合もある
        videoEnhanceSystemPrompt,
        currentVideoSourceImageFile
      );
      setVideoPrompt(enhancedPrompt);
    } catch (error) {
      console.error("Video prompt enhancement failed:", error);
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
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        FramePack (Video Generation)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploader imageType="video" />
        <div className="space-y-6">
          {/* PromptInput に拡張関連の props を渡す */}
          <PromptInput
            prompt={videoPrompt}
            setPrompt={setVideoPrompt}
            placeholder="Enter your video generation prompt here..."
            onEnhance={handleEnhance}
            isEnhancing={isEnhancing}
            enhanceError={enhanceError}
          />
          <ParameterSettings
            params={videoGenerationParams}
            setParams={setVideoGenerationParams}
          />
          <div className="text-center">
            <GenerateButton
              onClick={handleGenerateClick}
              isLoading={isGeneratingVideo}
              disabled={
                !videoSourceImage.file || isGeneratingVideo || isEnhancing // 拡張中も無効化
              }
            />
          </div>
          {/* 拡張中 or 生成中にプログレスバーを表示 */}
          {(isGeneratingVideo || isEnhancing) && <ProgressBar />}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerationPanel;
