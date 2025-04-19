import React from "react";

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  placeholder?: string;
}

const PromptInput: React.FC<PromptInputProps> = ({
  prompt,
  setPrompt,
  placeholder = "Enter your video generation prompt here...",
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  return (
    <div className="w-full">
      <label
        htmlFor="prompt-input"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" // ダークモード文字色追加
      >
        Prompt
      </label>
      <textarea
        id="prompt-input"
        rows={4}
        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" // ダークモードスタイル追加
        placeholder={placeholder}
        value={prompt}
        onChange={handleChange}
      />
    </div>
  );
};

export default PromptInput;
