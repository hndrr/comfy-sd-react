import React, { useEffect } from "react"; // useEffect をインポート
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
    setVideoSourceImage, // setVideoSourceImage を追加
    selectedSourceImage, // selectedSourceImage を追加
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
    setVideoError, // 状態管理アクション (新規)
    // setProgress, // WebSocket実装後に有効化
    // progress,
  } = useAppStore();

  // selectedSourceImage が変更されたら videoSourceImage を更新する Effect
  useEffect(() => {
    if (selectedSourceImage) {
      const fetchImageAndSetFile = async () => {
        try {
          const response = await fetch(selectedSourceImage);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          // ファイル名をURLのクエリパラメータから取得
          let fileName = "selected_source.png"; // デフォルトファイル名
          try {
            const url = new URL(selectedSourceImage);
            const params = new URLSearchParams(url.search);
            const filenameFromUrl = params.get("filename");
            if (filenameFromUrl) {
              fileName = filenameFromUrl;
            } else {
              // filenameパラメータがない場合、パスの最後の部分を試す (フォールバック)
              const pathPart = url.pathname.split("/").pop();
              if (pathPart) {
                fileName = pathPart;
              }
            }
          } catch (e) {
            console.error("Error parsing URL for filename:", e);
            // URL解析に失敗した場合、既存のロジックをフォールバックとして使用
            fileName =
              selectedSourceImage.split("/").pop() || "selected_source.png";
          }

          const file = new File([blob], fileName, { type: blob.type });
          setVideoSourceImage({ file, preview: selectedSourceImage });
        } catch (error) {
          console.error(
            "Error fetching or creating file from selected image:",
            error
          );
          // エラー処理: ユーザーに通知するなど
          setVideoError("Failed to load the selected source image.");
        }
      };
      fetchImageAndSetFile();
    }
    // selectedSourceImage が null になった場合（例えばクリア機能を追加した場合）は
    // videoSourceImage もリセットするかどうかを検討
    // else {
    //   setVideoSourceImage({ file: null, preview: "" });
    // }
  }, [selectedSourceImage, setVideoSourceImage, setVideoError]); // 依存配列に setVideoError を追加

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
