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
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]); // カメラデバイスリスト
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(''); // 選択中のデバイスID

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
      // videoRef.current.srcObject = null; // srcObjectをnullにするとエラーになることがあるためコメントアウト
      // 代わりにトラックを停止することで映像を止める
    }
    setIsCameraOpen(false);
    setCameraError(null);
    // カメラを閉じたらデバイスリストもクリア
    setCameraDevices([]);
    setSelectedDeviceId('');
  }, []);

  // startCamera は isCameraOpen を true にするだけ
  const startCamera = useCallback(() => {
    setCameraError(null); // エラーをリセット
    setIsCameraOpen(true);
  }, []);

  // isCameraOpen が true になったらカメラデバイスを取得する useEffect
  useEffect(() => {
    if (!isCameraOpen) {
      return; // カメラが閉じていれば何もしない
    }

    // カメラデバイスを取得
    const getCameraDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
           throw new Error("カメラデバイスのリスト取得がサポートされていません。");
        }
        // 権限がないと enumerateDevices は空のリストやラベルなしのリストを返すことがあるため、
        // 先に getUserMedia で権限を要求する（startCamera -> isCameraOpen=true の流れで権限要求は試みられているはず）
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); // ダミーで権限要求

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);

        if (videoDevices.length > 0) {
          // 選択中のデバイスIDがリストにない場合、または未選択の場合、最初のデバイスを選択
          if (!selectedDeviceId || !videoDevices.some(d => d.deviceId === selectedDeviceId)) {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        } else {
           throw new Error("利用可能なカメラが見つかりませんでした。");
        }
      } catch (err) {
        console.error("Failed to get camera devices:", err);
        setCameraError(err instanceof Error ? err.message : "カメラデバイスの取得に失敗しました。");
        stopCamera(); // エラー時はカメラを閉じる
      }
    };

    getCameraDevices();

  }, [isCameraOpen, stopCamera]); // isCameraOpen が変更されたときのみ実行


  // isCameraOpen または selectedDeviceId が変更されたら、カメラストリームを初期化/再初期化する useEffect
  useEffect(() => {
    // カメラが開いていない、デバイスが選択されていない、またはビデオ要素がなければ何もしない
    if (!isCameraOpen || !selectedDeviceId || !videoRef.current) {
      return;
    }

    let currentStream: MediaStream | null = null;
    const videoElement = videoRef.current;
    let cancelled = false; // クリーンアップ処理用フラグ

    const initializeVideoStream = async () => {
      // 既存のストリームがあれば停止（カメラ切り替えのため）
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("カメラ機能はこのブラウザではサポートされていません。");
        }

        // 選択されたデバイスIDでストリームを取得
        const constraints: MediaStreamConstraints = {
          video: { deviceId: { exact: selectedDeviceId } }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) { // ストリーム取得中にキャンセルされた場合
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = stream;
        streamRef.current = stream;
        videoElement.srcObject = stream;

        // メタデータ読み込みハンドラ
        const handleMetadataLoaded = () => {
          if (cancelled) return;
          videoElement.play().catch(err => {
            if (cancelled) return;
            console.error("Video playback failed:", err);
            setCameraError("ビデオの再生に失敗しました。ページをリロードするか、ブラウザの設定を確認してください。");
            stopCamera();
          });
        };

        // エラーハンドラ
        const handleError = (e: Event) => {
          if (cancelled) return;
          console.error("Video element error:", e);
          setCameraError("ビデオ要素の読み込み中にエラーが発生しました。");
          stopCamera();
        };

        // イベントリスナーを設定 (クリーンアップで削除するため、関数参照を保持)
        videoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
        videoElement.addEventListener('error', handleError);

        // クリーンアップ関数内でリスナーを削除
        return () => {
          videoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
          videoElement.removeEventListener('error', handleError);
        };

      } catch (err) {
        if (cancelled) return;
        console.error("Failed to access or process camera:", err);
        let message = "カメラへのアクセスまたは処理中にエラーが発生しました。";
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            message = "カメラへのアクセスが許可されていません。ブラウザの設定を確認してください。";
          } else if (err.name === "NotFoundError") {
            message = "指定されたカメラが見つからないか、アクセスできません。";
          } else if (err.name === "NotReadableError") {
             message = "カメラは他のアプリケーションで使用されている可能性があります。";
          } else if (err.name === "OverconstrainedError") {
             message = "指定されたカメラ解像度などがサポートされていません。";
          }
        } else if (err instanceof Error) {
          message = err.message;
        }
        setCameraError(message);
        stopCamera(); // エラー発生時にカメラUIを閉じる
        return () => {}; // クリーンアップ関数を返す
      }
    };

    let removeListeners: (() => void) | undefined;
    initializeVideoStream().then(cleanup => {
      removeListeners = cleanup; // イベントリスナー削除関数を保持
    });

    // クリーンアップ関数
    return () => {
      cancelled = true; // キャンセルフラグを立てる
      if (removeListeners) {
        removeListeners(); // イベントリスナーを削除
      }
      // ストリームを停止
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      // srcObjectをnullに設定 (stopCameraでも行うが念のため)
      if (videoElement && videoElement.srcObject) {
         // videoElement.srcObject = null; // これもエラーの原因になることがある
      }
      streamRef.current = null;
    };
  }, [isCameraOpen, selectedDeviceId, stopCamera]); // isCameraOpen, selectedDeviceId, stopCamera に依存


  const handleCapture = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // ビデオの実際の表示サイズではなく、ネイティブ解像度を使う
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        // 左右反転する場合 (多くのWebカメラはデフォルトで反転しているため)
        // context.translate(canvas.width, 0);
        // context.scale(-1, 1);
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
    startCamera();
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
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center h-auto"> {/* 高さをautoに */}
           {/* カメラ選択ドロップダウン (カメラが複数ある場合) */}
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
           {/* カメラ映像 */}
           <div className="relative w-full h-[350px] mb-4 rounded-md overflow-hidden bg-gray-900"> {/* 高さを固定し背景色を設定 */}
             <video
               ref={videoRef}
               className="w-full h-full object-cover" // object-coverでアスペクト比維持しつつ埋める
               playsInline
               autoPlay
               muted
             />
             <canvas ref={canvasRef} className="hidden"></canvas>
           </div>
           {/* 操作ボタン */}
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
