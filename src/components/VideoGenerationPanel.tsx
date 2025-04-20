import React from "react"; // useEffect を削除
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
    videoSourceImage,
    // setVideoSourceImage, // 不要になったため削除
    // selectedSourceImage, // 不要になったため削除
    videoPrompt,
    videoGenerationParams,
    isGeneratingVideo, // 状態管理から取得 (新規)
    generatedVideoUrl, // 状態管理から取得 (新規)
    videoError, // 状態管理から取得 (新規)
    // setSourceImage, // 不要になったため削除
    setVideoPrompt, // 状態管理アクション (新規)
    setVideoGenerationParams, // 状態管理アクション (新規)
    setIsGeneratingVideo, // 状態管理アクション (新規)
    setGeneratedVideoUrl, // 状態管理アクション (新規)
    // setVideoError, // setError は ResultsGallery で使用するためここでは不要
    // setProgress, // WebSocket実装後に有効化
    // progress,
  } = useAppStore();

  // 不要になった useEffect を削除

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
      // setProgress(null); // WebSocket実装後に有効化
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
