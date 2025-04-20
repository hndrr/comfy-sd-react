import React from "react";
import ImageUploader from "./ImageUploader";
import PromptInput from "./PromptInput";
import ParameterSettings from "./ParameterSettings";
import GenerateButton from "./GenerateButton";
import VideoPreview from "./VideoPreview";
import ProgressBar from "./ProgressBar";
import ErrorAlert from "./ErrorAlert";
import { useAppStore } from "../store/useAppStore";
import { comfyUIApi } from "../services/api";

const VideoGenerationPanel: React.FC = () => {
  const {
    videoSourceImage,
    videoPrompt,
    videoGenerationParams,
    isGeneratingVideo,
    generatedVideoUrl,
    videoError,
    setVideoPrompt,
    setVideoGenerationParams,
    setIsGeneratingVideo,
    setGeneratedVideoUrl,
    setVideoProgress,
  } = useAppStore();
  const handleGenerateClick = async () => {
    // setVideoError は ResultsGallery で処理するため、ここでの呼び出しを削除
    if (!videoSourceImage.file) {
      // videoSourceImage を使用
      // setError("Please select an image first."); // setError を使用
      useAppStore.getState().setError("Please select an image first."); // 直接ストアのアクションを呼ぶ
      return;
    }

    setIsGeneratingVideo(true); // 生成開始
    // setVideoError(null); // setError を使用
    useAppStore.getState().setError(null); // 直接ストアのアクションを呼ぶ

    try {
      const result = await comfyUIApi.generateVideo(
        videoSourceImage.file,
        videoPrompt,
        videoGenerationParams,
        setVideoProgress
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
        // setVideoError(...) // setError を使用
        useAppStore
          .getState()
          .setError(
            result.error || "Failed to generate video or invalid data received."
          );
      }
    } catch (error) {
      console.error("Video generation failed:", error);
      // setVideoError(...) // setError を使用
      useAppStore
        .getState()
        .setError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred during video generation."
        );
    } finally {
      // setIsGeneratingVideo(false); // generateVideo内で結果/エラー時にfalseになるはず
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Video Generation
      </h2>
      {/* 1. Image Upload - image プロパティは不要 */}
      <ImageUploader imageType="video" />
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
      {/* 5. Progress Bar */}
      {isGeneratingVideo && <ProgressBar />} {/* コメント解除し、propsを削除 */}
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
