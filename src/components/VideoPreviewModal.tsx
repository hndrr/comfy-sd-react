import { X } from "lucide-react";
import React from "react";
import { useAppStore } from "../store/useAppStore";

const VideoPreviewModal: React.FC = () => {
  const { isVideoPreviewModalOpen, previewVideoUrl, closeVideoPreviewModal } =
    useAppStore();

  if (!isVideoPreviewModalOpen || !previewVideoUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={closeVideoPreviewModal} // 背景クリックで閉じる
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // モーダル内クリックは伝播させない
      >
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={closeVideoPreviewModal}
          className="absolute top-2 right-2 p-2 rounded-full bg-gray-500/50 text-white hover:bg-gray-600/70 transition-colors z-10"
          aria-label="閉じる"
        >
          <X size={24} />
        </button>

        {/* 動画プレイヤー */}
        <video
          src={previewVideoUrl}
          controls // 再生コントロールを表示
          autoPlay // 自動再生
          loop // ループ再生
          muted // 最初はミュート (ブラウザポリシー対策)
          className="w-full h-auto max-h-[calc(90vh-4rem)] block" // 高さが親を超えないように
        >
          お使いのブラウザはvideoタグをサポートしていません。
        </video>
        {/* 必要であれば動画タイトルなどを表示 */}
        {/* <div className="p-4 text-center text-sm text-gray-700 dark:text-gray-300">
          動画プレビュー
        </div> */}
      </div>
    </div>
  );
};

export default VideoPreviewModal;