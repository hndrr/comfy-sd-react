import { Download, Play, SendToBack, Trash2 } from "lucide-react";
import React from "react";
import { useAppStore } from "../store/useAppStore";
import { GenerationResult } from "../types";
import { downloadImage, downloadVideo } from "../utils/imageHelpers";

const ResultItem: React.FC<{
  result: GenerationResult;
  onDelete: (id: string) => void;
}> = ({ result, onDelete }) => {
  const {
    activeTab,
    setSourceImage,
    setVideoSourceImage,
    setError,
    openPreviewModal,
    openVideoPreviewModal, 
  } = useAppStore();

  const { id, type, timestamp, imageUrl, videoUrl, thumbnailUrl } = result; // result から必要な情報を展開

  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  // ソースとして選択する処理
  // ソースとして選択する処理 (画像の場合のみ)
  const handleSelectAsSource = async (urlToFetch: string | undefined) => {
    if (!urlToFetch) return; // URLがなければ何もしない
    try {
      const response = await fetch(urlToFetch);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      // ファイル名をURLのクエリパラメータから取得
      let fileName = "selected_source.png";
      try {
        const url = new URL(urlToFetch);
        const params = new URLSearchParams(url.search);
        const filenameFromUrl = params.get("filename");
        if (filenameFromUrl) {
          fileName = filenameFromUrl;
        } else {
          const pathPart = url.pathname.split("/").pop();
          if (pathPart) {
            fileName = pathPart;
          }
        }
      } catch (e) {
        console.error("Error parsing URL for filename:", e);
        fileName = urlToFetch.split("/").pop() || "selected_source.png";
      }

      const file = new File([blob], fileName, { type: blob.type });
      const imageFile = { file, preview: urlToFetch };

      if (activeTab === "image") {
        setSourceImage(imageFile);
      } else if (activeTab === "video") {
        setVideoSourceImage(imageFile);
      }
      setError(null); // エラーをクリア
    } catch (error) {
      console.error(
        "Error fetching or creating file from selected image:",
        error
      );
      setError("Failed to load the selected source image.");
    }
  };

  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      {/* タイプに応じて表示を切り替え */}
      {type === "image" && imageUrl && (
        <img
          src={imageUrl}
          alt={`画像生成結果 ${formattedDate}`}
          className="w-full h-48 object-cover cursor-pointer"
          loading="lazy"
          onClick={() => openPreviewModal(imageUrl)}
        />
      )}
      {type === "video" && (
        <div
          className="w-full h-48 bg-black flex items-center justify-center cursor-pointer relative"
          onClick={() => videoUrl && openVideoPreviewModal(videoUrl)}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`動画サムネイル ${formattedDate}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : videoUrl ? (
            // サムネイルがない場合は video 要素で最初のフレームを表示試行
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              preload="metadata" // メタデータ（最初のフレーム含む）を読み込む
              muted // 自動再生しないようにミュート
              playsInline // iOSでのインライン再生
            />
          ) : (
            <div className="text-gray-500">動画プレビューなし</div>
          )}
          {/* 再生アイコンをオーバーレイ */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="text-white w-12 h-12" fill="currentColor" />
          </div>
        </div>
      )}

      {/* オーバーレイ自体はクリックイベントを無視し、中のボタンのみ有効にする */}
      <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity pointer-events-none">
        <div className="text-xs text-white self-end">{formattedDate}</div>
        <div className="flex justify-between items-end pointer-events-auto">
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-full bg-red-600/80 text-white hover:bg-red-700 transition-colors" // pointer-events-auto は不要 (親で設定)
            aria-label="この結果を削除"
          >
            <Trash2 size={16} />
          </button>
          <div className="flex space-x-1">
            {type === "image" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAsSource(imageUrl);
                }}
                className="p-1.5 rounded-full bg-green-600/80 text-white hover:bg-green-700 transition-colors"
                aria-label={`ソース画像として使用 (${
                  activeTab === "image" ? "画像生成" : "動画生成"
                })`}
                title="ソース画像として使用"
              >
                <SendToBack size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (type === "image" && imageUrl) {
                  downloadImage(imageUrl, `comfyui-img-${Date.now()}.png`);
                } else if (type === "video" && videoUrl) {
                  await downloadVideo(videoUrl, `comfyui-vid-${Date.now()}.mp4`);
                }
              }}
              className="p-1.5 rounded-full bg-blue-600/80 text-white hover:bg-blue-700 transition-colors"
              aria-label={type === "image" ? "画像をダウンロード" : "動画をダウンロード"}
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultsGallery: React.FC = () => {
  const { results, removeResult } = useAppStore();

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-8">
      <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
        生成結果
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((result) => (
          <ResultItem
            key={result.id}
            result={result}
            onDelete={removeResult}
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;
