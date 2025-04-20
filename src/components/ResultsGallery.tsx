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
  onSelectAsSource: (imageUrl: string) => void; // ソース選択用コールバックを追加
}> = ({ id, imageUrl, timestamp, onDelete, onPreview, onSelectAsSource }) => {
  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

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
                e.stopPropagation();
                onSelectAsSource(imageUrl);
              }} // イベント伝播を停止
              className="p-1.5 rounded-full bg-green-600/80 text-white hover:bg-green-700 transition-colors"
              aria-label="ソース画像として使用"
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
  // setSelectedSourceImage を useAppStore から取得
  const { results, removeResult, openPreviewModal, setSelectedSourceImage } =
    useAppStore();

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
            onSelectAsSource={setSelectedSourceImage} // ソース選択関数を渡す
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;
