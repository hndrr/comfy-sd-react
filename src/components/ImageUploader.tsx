import { Camera, RefreshCcw, Upload, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { createPreviewFromFile } from "../utils/imageHelpers";

interface ImageUploaderProps {
  imageType: "image" | "video";
}

type ImageSource = 'camera' | 'file' | null; // 画像ソースの型定義

const ImageUploader: React.FC<ImageUploaderProps> = ({ imageType }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [imageSource, setImageSource] = useState<ImageSource>(null); // ★ 画像ソースの状態を追加

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
    setIsCameraOpen(false);
    setCameraError(null);
    setCameraDevices([]);
    // setSelectedDeviceId(''); // 維持
  }, []);

  const startCamera = useCallback(() => {
    setCameraError(null);
    setIsCameraOpen(true);
  }, []);

  // isCameraOpen が true になったらカメラデバイスを取得する useEffect
  useEffect(() => {
    if (!isCameraOpen) {
      return;
    }
    const getCameraDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
           throw new Error("カメラデバイスのリスト取得がサポートされていません。");
        }
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          if (!selectedDeviceId || !videoDevices.some(d => d.deviceId === selectedDeviceId)) {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        } else {
           throw new Error("利用可能なカメラが見つかりませんでした。");
        }
      } catch (err) {
        console.error("Failed to get camera devices:", err);
        setCameraError(err instanceof Error ? err.message : "カメラデバイスの取得に失敗しました。");
        stopCamera();
      }
    };
    getCameraDevices();
  }, [isCameraOpen, selectedDeviceId, stopCamera]);


  // isCameraOpen または selectedDeviceId が変更されたら、カメラストリームを初期化/再初期化する useEffect
  useEffect(() => {
    if (!isCameraOpen || !selectedDeviceId || !videoRef.current) {
      return;
    }
    let currentStream: MediaStream | null = null;
    const videoElement = videoRef.current;
    let cancelled = false;
    let removeListeners: (() => void) | undefined;

    const initializeVideoStream = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("カメラ機能はこのブラウザではサポートされていません。");
        }
        const constraints: MediaStreamConstraints = {
          video: { deviceId: { exact: selectedDeviceId } }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        currentStream = stream;
        streamRef.current = stream;
        videoElement.srcObject = stream;

        const handleMetadataLoaded = () => {
          if (cancelled) return;
          videoElement.play().catch(err => {
            if (cancelled) return;
            console.error("Video playback failed:", err);
            setCameraError("ビデオの再生に失敗しました。");
            stopCamera();
          });
        };
        const handleError = (e: Event) => {
          if (cancelled) return;
          console.error("Video element error:", e);
          setCameraError("ビデオ要素のエラー。");
          stopCamera();
        };

        videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
        videoElement.addEventListener('error', handleError);

        return () => {
          videoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
          videoElement.removeEventListener('error', handleError);
        };
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to access camera:", err);
        let message = "カメラアクセスエラー。";
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") message = "カメラ許可なし。";
          else if (err.name === "NotFoundError") message = "カメラが見つかりません。";
          else if (err.name === "NotReadableError") message = "カメラ使用中。";
          else if (err.name === "OverconstrainedError") message = "カメラ非対応設定。";
        } else if (err instanceof Error) message = err.message;
        setCameraError(message);
        stopCamera();
        return () => {};
      }
    };

    initializeVideoStream().then(cleanup => {
      if (!cancelled) {
        removeListeners = cleanup;
      }
    });

    return () => {
      cancelled = true;
      if (removeListeners) {
        removeListeners();
      }
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, [isCameraOpen, selectedDeviceId, stopCamera]);


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
              setImageSource('camera'); // ★ カメラソースとして記録
              stopCamera();
            } catch (error) {
              console.error("Preview creation failed:", error);
              setCameraError("画像処理エラー。");
            }
          } else {
             setCameraError("画像データ生成失敗。");
          }
        }, "image/png");
      } else {
         setCameraError("Canvas取得失敗。");
      }
    } else {
       setCameraError("ビデオ/Canvas要素なし。");
    }
  }, [setImage, stopCamera]);

  const handleCameraClick = () => {
    startCamera();
  };

  const handleCancelCamera = () => {
    stopCamera();
  };

  const handleRetake = useCallback(() => {
    setImage({ file: null, preview: "" });
    setImageSource(null); // ★ ソースをリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    startCamera();
  }, [setImage, startCamera]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const preview = await createPreviewFromFile(file);
        setImage({ file, preview });
        setImageSource('file'); // ★ ファイルソースとして記録
      } catch (error) {
        console.error("Preview creation failed:", error);
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
        setImageSource('file'); // ★ ファイルソースとして記録
      } catch (error) {
        console.error("Preview creation failed:", error);
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
    setImageSource(null); // ★ ソースをリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    stopCamera();
  }, [setImage, stopCamera]);

  return (
    <div className="w-full">
      <h2 className="font-medium text-gray-900 dark:text-white mb-2">Source Image</h2>
      {isCameraOpen && (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center h-auto">
           {cameraDevices.length > 1 && (
             <div className="w-full mb-2">
               <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                 カメラ選択:
               </label>
               <select
                 id="camera-select"
                 value={selectedDeviceId}
                 onChange={(e) => setSelectedDeviceId(e.target.value)}
                 className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
               >
                 {cameraDevices.map((device) => (
                   <option key={device.deviceId} value={device.deviceId}>
                     {device.label || `カメラ ${cameraDevices.indexOf(device) + 1}`}
                   </option>
                 ))}
               </select>
             </div>
           )}
           <div className="relative w-full h-[350px] mb-4 rounded-md overflow-hidden bg-gray-900">
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
           <div className="absolute top-2 right-2 flex gap-2">
              {/* ★ 再撮影ボタン: imageSourceが'camera'の場合のみ表示 */}
              {imageSource === 'camera' && (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-900/70 rounded-md text-white text-xs hover:bg-gray-900 transition-colors"
                  aria-label="再撮影"
                  title="再撮影"
                >
                  <RefreshCcw size={14} />
                  <span>再撮影</span>
                </button>
              )}
              {/* 削除ボタン */}
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 bg-gray-900/70 rounded-full text-white hover:bg-gray-900 transition-colors"
                aria-label="画像を削除"
                title="画像を削除"
              >
                <X size={18} />
              </button>
           </div>
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
