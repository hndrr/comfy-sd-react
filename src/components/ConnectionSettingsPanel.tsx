import React from "react";
import { Modal, ModalOverlay, Dialog, Heading } from "react-aria-components";
import { X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export const ConnectionSettingsPanel: React.FC = () => {
  const {
    apiUrl,
    setApiUrl,
    isConnectionSettingsOpen,
    toggleConnectionSettings,
  } = useAppStore();

  // Tailwind CSS クラス (アニメーションは別途設定が必要な場合があります)
  const overlayClasses =
    "fixed inset-0 z-20 bg-black/50 entering:animate-fadeIn exiting:animate-fadeOut";
  const modalClasses =
    "fixed top-0 right-0 bottom-0 z-30 w-full max-w-md bg-white dark:bg-gray-800 shadow-lg outline-none border-l border-gray-200 dark:border-gray-700 entering:animate-slideIn exiting:animate-slideOut";
  const dialogClasses = "p-6 h-full flex flex-col";
  const headingClasses =
    "text-xl font-semibold mb-4 text-gray-900 dark:text-white";
  const closeButtonClasses =
    "absolute top-4 right-4 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <ModalOverlay
      isOpen={isConnectionSettingsOpen}
      onOpenChange={toggleConnectionSettings}
      isDismissable // 背景クリックで閉じる
      className={overlayClasses}
    >
      <Modal className={modalClasses}>
        <Dialog className={dialogClasses}>
          {(
            { close } // Dialogからclose関数を取得
          ) => (
            <>
              <div className="flex justify-between items-center mb-4">
                <Heading slot="title" className={headingClasses}>
                  接続設定
                </Heading>
                <button
                  onClick={close}
                  className={closeButtonClasses}
                  aria-label="閉じる"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-grow space-y-4 overflow-y-auto">
                {" "}
                {/* パネル内容が長い場合にスクロール可能にする */}
                <div>
                  <label
                    htmlFor="apiUrlPanel" // IDを元のフォームと区別
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    ComfyUI API URL
                  </label>
                  <input
                    id="apiUrlPanel"
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="http://127.0.0.1:8188"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    実行中のComfyUI APIのURLを入力してください。
                  </p>
                </div>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
};
