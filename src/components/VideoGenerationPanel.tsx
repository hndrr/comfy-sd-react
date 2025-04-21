import React from "react";
import { comfyUIApi } from "../services/api";
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
    // generatedVideoUrl, // 削除
    // videoError, // 削除 (setError に統一)
    setVideoPrompt,
    setVideoGenerationParams,
    setIsGeneratingVideo,
    // setGeneratedVideoUrl, // 削除 (addResult を使用)
    setVideoProgress,
    addResult, // addResult をインポート
    setError, // setError をインポート
  } = useAppStore();
  const handleGenerateClick = async () => {
    if (!videoSourceImage.file) {
      setError("Please select an image first."); // setError を使用
      return;
    }

    setIsGeneratingVideo(true);
    setError(null); // エラーをクリア

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
        addResult(result.data as GenerationResult); // ストアに結果を追加
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
      // setIsGeneratingVideo(false); // finally でのセットは不要 (addResult or setError で処理される)
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Video Generation
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploader imageType="video" />
        <div className="space-y-6">
          <PromptInput prompt={videoPrompt} setPrompt={setVideoPrompt} />
          <ParameterSettings
            params={videoGenerationParams}
            setParams={setVideoGenerationParams}
          />
          <div className="text-center">
            <GenerateButton
              onClick={handleGenerateClick}
              isLoading={isGeneratingVideo}
              disabled={!videoSourceImage.file || isGeneratingVideo} // videoSourceImage を使用
            />
          </div>
          {/* isGeneratingVideo をストアから取得して ProgressBar を表示 */}
          {isGeneratingVideo && <ProgressBar />}
          {/* videoError は削除し、共通の ErrorAlert を使用 (App.tsx で表示) */}
          {/* {videoError && <ErrorAlert message={videoError} />} */}
          {/* generatedVideoUrl は削除し、ResultsGallery で表示 */}
          {/* {generatedVideoUrl && !isGeneratingVideo && ( ... )} */}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerationPanel;
