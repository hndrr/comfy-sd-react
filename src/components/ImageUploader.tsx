import { Camera, Upload, X } from "lucide-react"; // Camera アイコンを追加
import React, { useCallback, useEffect, useRef, useState } from "react"; // useEffect をインポート
import { useAppStore } from "../store/useAppStore";
import { createPreviewFromFile } from "../utils/imageHelpers";
interface ImageUploaderProps {
  imageType: "image" | "video";
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ imageType }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { sourceImage, setSourceImage, videoSourceImage, setVideoSourceImage } =
    useAppStore();

  const currentImage = imageType === "video" ? videoSourceImage : sourceImage;
  const setImage = imageType === "video" ? setVideoSourceImage : setSourceImage;

  // --- カメラ関連の関数 ---

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  }, []);

  // startCamera は isCameraOpen を true にするだけ
  const startCamera = useCallback(() => {
    setCameraError(null); // エラーをリセット
    setIsCameraOpen(true);
  }, []);

  // isCameraOpen が true になったらカメラを起動する useEffect
  useEffect(() => {
    // isCameraOpen が false または videoRef がまだ存在しない場合は何もしない
    if (!isCameraOpen || !videoRef.current) {
      return;
    }

    let currentStream: MediaStream | null = null; // クリーンアップ用にストリームを保持
    const videoElement = videoRef.current; // useEffect内で参照を固定

    const initializeCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error("mediaDevices or getUserMedia not supported");
          throw new Error("カメラ機能はこのブラウザではサポートされていません。");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        currentStream = stream; // クリーンアップ用に保持
        streamRef.current = stream; // Refにも保持

        videoElement.srcObject = stream;

        // メタデータ読み込みハンドラ
        const handleMetadataLoaded = () => {
          videoElement.play().catch(err => {
            console.error("Video playback failed:", err);
            setCameraError("ビデオの再生に失敗しました。ページをリロードするか、ブラウザの設定を確認してください。");
            stopCamera();
          });
        };

        // エラーハンドラ
        const handleError = (e: Event) => {
          console.error("Video element error:", e);
          setCameraError("ビデオ要素の読み込み中にエラーが発生しました。");
          stopCamera();
        };

        // イベントリスナーを設定
        videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
        videoElement.addEventListener('error', handleError);
      } catch (err) {
        console.error("Failed to access or process camera:", err);
        let message = "カメラへのアクセスまたは処理中にエラーが発生しました。";
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            message = "カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。";
          } else if (err.name === "NotFoundError") {
            message = "利用可能なカメラが見つかりませんでした。";
          }
        } else if (err instanceof Error) {
          message = err.message;
        }
        setCameraError(message);
        stopCamera(); // エラー発生時にカメラUIを閉じる
      }
    };

    initializeCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (videoElement.srcObject) {
         videoElement.srcObject = null;
      }
      streamRef.current = null;
    };
  }, [isCameraOpen, stopCamera]); // isCameraOpen と stopCamera に依存


  const handleCapture = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.png`, { type: "image/png" });
            try {
              const preview = await createPreviewFromFile(file);
              setImage({ file, preview });
              stopCamera(); // 撮影成功後カメラを閉じる
            } catch (error) {
              console.error("キャプチャ画像のプレビュー作成に失敗しました", error);
              setCameraError("画像の処理中にエラーが発生しました。");
            }
          } else {
             setCameraError("画像データの生成に失敗しました。");
          }
        }, "image/png");
      } else {
         setCameraError("Canvasコンテキストの取得に失敗しました。");
      }
    } else {
       setCameraError("ビデオまたはCanvas要素が見つかりません。");
    }
  }, [setImage, stopCamera]);

  const handleCameraClick = () => {
    startCamera(); // isCameraOpen を true に設定する
  };

  const handleCancelCamera = () => {
    stopCamera();
  };

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const preview = await createPreviewFromFile(file);
        setImage({ file, preview });
      } catch (error) {
        console.error("画像のプレビュー作成に失敗しました", error);
      }
    },
    [setImage]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      try {
        const preview = await createPreviewFromFile(file);
        setImage({ file, preview });
      } catch (error) {
        console.error("画像のプレビュー作成に失敗しました", error);
      }
    },
    [setImage]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  const handleClear = useCallback(() => {
    setImage({ file: null, preview: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    stopCamera();
  }, [setImage, stopCamera]);

  return (
    <div className="w-full">
      <h2 className="font-medium text-gray-900 dark:text-white mb-2">Source Image</h2>
      {isCameraOpen && (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center h-[450px]">
           <div className="relative w-full flex-grow mb-4 rounded-md overflow-hidden">
             <video
               ref={videoRef}
               className="w-full h-full object-cover"
               playsInline
               autoPlay
               muted
             />
             <canvas ref={canvasRef} className="hidden"></canvas>
           </div>
           <div className="flex gap-4 w-full">
             <button
               type="button"
               onClick={handleCapture}
               className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
             >
               <Camera size={18} className="mr-2" />
               撮影
             </button>
             <button
               type="button"
               onClick={handleCancelCamera}
               className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             >
               <X size={18} className="mr-2" />
               キャンセル
             </button>
           </div>
        </div>
      )}

      {!isCameraOpen && currentImage.preview && (
         <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 h-[450px] flex items-center justify-center">
           <img
             src={currentImage.preview}
             alt="アップロードされた画像"
             className="max-w-full max-h-full object-contain rounded-lg"
           />
           <button
             type="button"
             onClick={handleClear}
             className="absolute top-2 right-2 p-1.5 bg-gray-900/70 rounded-full text-white hover:bg-gray-900 transition-colors"
             aria-label="画像を削除"
           >
             <X size={18} />
           </button>
         </div>
      )}

      {!isCameraOpen && !currentImage.preview && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center h-[450px] flex flex-col justify-center">
          <div
             className="flex-grow flex flex-col justify-center items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
             onClick={() => fileInputRef.current?.click()}
             onDrop={handleDrop}
             onDragOver={handleDragOver}
           >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              画像をドラッグ＆ドロップ、または{" "}
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                クリックして選択
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              PNG, JPG, WEBP (最大10MB)
            </p>
          </div>

          {cameraError && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{cameraError}</p>
          )}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCameraClick}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-900/50 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
                disabled={isCameraOpen}
              >
                <Camera size={18} className="mr-2" />
                カメラで撮影
              </button>
            </div>
        </div>
      )}


      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;
