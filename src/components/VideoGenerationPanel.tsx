import React from "react";
import ImageUploader from "./ImageUploader"; // 既存コンポーネント
import PromptInput from "./PromptInput"; // 新規
import ParameterSettings from "./ParameterSettings"; // 新規
import GenerateButton from "./GenerateButton"; // 新規
import VideoPreview from "./VideoPreview"; // 新規
// import ProgressBar from './ProgressBar'; // 既存コンポーネント (WebSocket実装後に有効化)
import ErrorAlert from "./ErrorAlert"; // 既存コンポーネント
import { useAppStore } from "../store/useAppStore"; // 状態管理
import { comfyUIApi } from "../services/api"; // APIサービス

const VideoGenerationPanel: React.FC = () => {
  const {
    videoSourceImage, // videoSourceImage を使用
    videoPrompt, // 状態管理から取得 (新規)
    videoGenerationParams, // 状態管理から取得 (新規)
    isGeneratingVideo, // 状態管理から取得 (新規)
    generatedVideoUrl, // 状態管理から取得 (新規)
    videoError, // 状態管理から取得 (新規)
    // setSourceImage, // 不要になったため削除
    setVideoPrompt, // 状態管理アクション (新規)
    setVideoGenerationParams, // 状態管理アクション (新規)
    setIsGeneratingVideo, // 状態管理アクション (新規)
    setGeneratedVideoUrl, // 状態管理アクション (新規)
    setVideoError, // 状態管理アクション (新規)
    // setProgress, // WebSocket実装後に有効化
    // progress, // WebSocket実装後に有効化
  } = useAppStore();

  const handleGenerateClick = async () => {
    if (!videoSourceImage.file) {
      // videoSourceImage を使用
      setVideoError("Please select an image first.");
      return;
    }

    setIsGeneratingVideo(true); // 生成開始
    setVideoError(null);
    // setProgress(0); // WebSocket実装後に有効化

    try {
      const result = await comfyUIApi.generateVideo(
        videoSourceImage.file, // videoSourceImage を使用
        videoPrompt,
        videoGenerationParams
        // (progressValue) => setProgress(progressValue) // WebSocket実装後に有効化
      );

      // 結果データの型ガードを強化
      if (
        result.status === "success" &&
        typeof result.data === "object" &&
        result.data !== null &&
        "imageUrl" in result.data &&
        typeof result.data.imageUrl === "string" // imageUrlがstringであることを確認
      ) {
        // imageUrl は動画URLを想定
        setGeneratedVideoUrl(result.data.imageUrl);
      } else {
        setVideoError(
          result.error || "Failed to generate video or invalid data received."
        );
      }
    } catch (error) {
      console.error("Video generation failed:", error);
      setVideoError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during video generation."
      );
    } finally {
      // setIsGeneratingVideo(false); // generateVideo内で結果/エラー時にfalseになるはず
      // setProgress(null); // WebSocket実装後に有効化
    }
  };

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg space-y-6 bg-white dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Video Generation
      </h2>
      {/* 1. Image Upload */}
      <ImageUploader imageType="video" /> {/* imageType を指定 */}
      {/* 2. Prompt Input */}
      <PromptInput prompt={videoPrompt} setPrompt={setVideoPrompt} />
      {/* 3. Parameter Settings */}
      <ParameterSettings
        params={videoGenerationParams}
        setParams={setVideoGenerationParams}
      />
      {/* 4. Generate Button */}
      <div className="text-center">
        <GenerateButton
          onClick={handleGenerateClick}
          isLoading={isGeneratingVideo}
          disabled={!videoSourceImage.file || isGeneratingVideo} // videoSourceImage を使用
        />
      </div>
      {/* 5. Progress Bar (WebSocket実装後に有効化) */}
      {/* {isGeneratingVideo && <ProgressBar progress={progress} />} */}
      {/* 6. Error Alert */}
      {videoError && <ErrorAlert message={videoError} />}
      {/* 7. Video Preview */}
      {generatedVideoUrl && !isGeneratingVideo && (
        <VideoPreview
          videoUrl={generatedVideoUrl}
          fileName={`video_${Date.now()}.mp4`}
        />
      )}
    </div>
  );
};

export default VideoGenerationPanel;
