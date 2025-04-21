import { X } from "lucide-react";
import React from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
}) => {
  // Tailwind CSS クラス
  const overlayClasses =
    "fixed inset-0 z-50 bg-black/70 flex items-center justify-center entering:animate-fadeIn exiting:animate-fadeOut"; // z-index を 50 に変更
  const modalClasses = "max-w-4xl max-h-[90vh] outline-none"; // 画像サイズに合わせて調整
  const dialogClasses = "relative outline-none"; // Dialog自体にはスタイル不要な場合も
  const closeButtonClasses =
    "absolute -top-8 -right-8 p-1 rounded-full text-white bg-black/50 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white";

  if (!imageUrl) return null; // URLがなければ何も表示しない

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onClose} // モーダル外クリックやEscapeキーで閉じる
      isDismissable
      className={overlayClasses}
    >
      <Modal className={modalClasses}>
        <Dialog className={dialogClasses} aria-label="Image Preview">
            <img
              src={imageUrl}
              alt="Generated Preview"
              className="block max-w-full max-h-[90vh] object-contain" // 画像がコンテナを超えないように
            />
            <button
              onClick={onClose}
              className={closeButtonClasses}
              aria-label="閉じる"
            >
              <X size={24} />
            </button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};
