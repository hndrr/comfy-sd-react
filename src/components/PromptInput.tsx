import { Loader, Sparkles } from "lucide-react"; // アイコンをインポート
import React from "react";

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  placeholder?: string;
  onEnhance?: () => Promise<void>; // 拡張処理を実行するコールバック
  isEnhancing?: boolean; // 拡張処理中フラグ
  enhanceError?: string | null; // 拡張エラーメッセージ
}

const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  setPrompt,
  placeholder = "Enter your prompt here...", // デフォルトプレースホルダーを汎用的に変更
  onEnhance,
  isEnhancing = false, // デフォルト値を追加
  enhanceError = null, // デフォルト値を追加
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  return (
    <div className="w-full space-y-2"> {/* space-y を追加して要素間に余白 */}
      <label
        htmlFor="prompt-input"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Prompt
      </label>
      <textarea
        id="prompt-input"
        rows={4}
        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        placeholder={placeholder}
        value={prompt}
        onChange={handleChange}
      />
      {/* 拡張ボタンとエラー表示 */}
      {onEnhance && (
        <div className="flex flex-col items-end space-y-1"> {/* 右寄せと縦方向の余白 */}
          <button
            type="button"
            onClick={onEnhance}
            disabled={isEnhancing} // isEnhancing のみで制御
            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
              isEnhancing // 条件を isEnhancing のみに変更
                ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            }`}
          >
            {isEnhancing ? (
              <>
                <Loader size={16} className="animate-spin -ml-0.5 mr-1.5" />
                拡張中...
              </>
            ) : (
              <>
                <Sparkles size={16} className="-ml-0.5 mr-1.5" />
                プロンプトを拡張
              </>
            )}
          </button>
          {enhanceError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {enhanceError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptInput;
