import React from "react";
import { Download, Trash2, SendToBack } from "lucide-react"; // SendToBack を追加
import { useAppStore } from "../store/useAppStore";
import { downloadImage } from "../utils/imageHelpers";

const ResultItem: React.FC<{
  id: string;
  imageUrl: string;
  timestamp: number;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
  // onSelectAsSource は削除
}> = ({ id, imageUrl, timestamp, onDelete, onPreview }) => {
  // onSelectAsSource を削除
  const { activeTab, setSourceImage, setVideoSourceImage, setError } =
    useAppStore(); // ストアから必要なものを取得

  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  // ソースとして選択する処理
  const handleSelectAsSource = async (urlToFetch: string) => {
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
      <img
        src={imageUrl}
        alt={`生成結果 ${formattedDate}`}
        className="w-full h-48 object-cover cursor-pointer" // カーソルをポインターに
        loading="lazy"
        onClick={() => onPreview(imageUrl)} // デバッグ用ログを削除
      />

      {/* オーバーレイ自体はクリックイベントを無視し、中のボタンのみ有効にする */}
      <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity pointer-events-none">
        {" "}
        {/* pointer-events-none を追加 */}
        <div className="text-xs text-white self-end">{formattedDate}</div>
        <div className="flex justify-between items-end pointer-events-auto">
          {" "}
          {/* ボタンコンテナに pointer-events-auto を追加 */}
          {/* 削除ボタン */}
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-full bg-red-600/80 text-white hover:bg-red-700 transition-colors" // pointer-events-auto は不要 (親で設定)
            aria-label="この結果を削除"
          >
            <Trash2 size={16} />
          </button>
          <div className="flex space-x-1">
            {" "}
            {/* ここも pointer-events-auto は不要 (親で設定) */}
            {/* ソースとして使用ボタン */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // イベント伝播を停止
                handleSelectAsSource(imageUrl); // 新しい関数を呼び出す
              }}
              className="p-1.5 rounded-full bg-green-600/80 text-white hover:bg-green-700 transition-colors"
              aria-label={`ソース画像として使用 (${
                activeTab === "image" ? "画像生成" : "動画生成"
              })`} // アクティブタブに応じてラベル変更
              title="ソース画像として使用"
            >
              <SendToBack size={16} />
            </button>
            {/* ダウンロードボタン */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(imageUrl, `comfyui-gen-${Date.now()}.png`);
              }} // イベント伝播を停止
              className="p-1.5 rounded-full bg-blue-600/80 text-white hover:bg-blue-700 transition-colors"
              aria-label="画像をダウンロード"
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
  // setSelectedSourceImage は不要になったので削除
  const { results, removeResult, openPreviewModal } = useAppStore();

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
            id={result.id}
            imageUrl={result.imageUrl}
            timestamp={result.timestamp}
            onDelete={removeResult}
            onPreview={openPreviewModal}
            // onSelectAsSource は ResultItem 内部で処理するため削除
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;
