import { Sliders } from "lucide-react";
import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { VideoGenerationParams } from "../types"; // types/index.ts からインポート

// Props の型を VideoGenerationParams に変更
interface ParameterSettingsProps {
  params: VideoGenerationParams;
  setParams: (params: Partial<VideoGenerationParams>) => void;
}

const ParameterSettings: React.FC<ParameterSettingsProps> = ({
  params,
  setParams,
}) => {
  // useAppStore から必要な状態とアクションを取得
  const { videoEnhanceSystemPrompt, setVideoEnhanceSystemPrompt } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Input の変更をハンドルする関数
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    // 数値に変換すべきパラメータ名を VideoGenerationParams に合わせて更新
    const numericParams: (keyof VideoGenerationParams)[] = [ // 型参照を修正
      'steps',
      'cfgScale',
      'fps',
      'seed',
      'total_second_length',
      'denoiseStrength',
    ];
    if (numericParams.includes(name as keyof VideoGenerationParams)) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
         setParams({ [name]: numValue });
      }
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Video Parameters
      </h3>
      {/* パラメータ設定エリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 既存のパラメータ入力 (一部抜粋、必要に応じて追加・修正) */}
        <div>
          <label
            htmlFor="steps"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Steps: {params.steps}
          </label>
          <input
            type="range" // スライダーに変更
            name="steps"
            id="steps"
            value={params.steps}
            onChange={handleChange}
            min="1"
            max="50" // 適切な範囲に調整
            step="1"
            className="w-full accent-blue-600 dark:accent-blue-400"
          />
        </div>
        <div>
          <label
            htmlFor="cfgScale"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            CFG Scale: {params.cfgScale?.toFixed(1)}
          </label>
          <input
            type="range" // スライダーに変更
            name="cfgScale"
            id="cfgScale"
            value={params.cfgScale ?? 7}
            onChange={handleChange}
            min="1"
            max="20"
            step="0.5"
            className="w-full accent-blue-600 dark:accent-blue-400"
          />
        </div>
         <div>
          <label
            htmlFor="fps"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            FPS: {params.fps}
          </label>
          <input
            type="range" // スライダーに変更
            name="fps"
            id="fps"
            value={params.fps}
            onChange={handleChange}
            min="1"
            max="60"
            step="1"
            className="w-full accent-blue-600 dark:accent-blue-400"
          />
        </div>
        <div>
          <label
            htmlFor="denoiseStrength"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Denoise Strength: {params.denoiseStrength?.toFixed(2)}
          </label>
          <input
            type="range" // スライダーに変更
            name="denoiseStrength"
            id="denoiseStrength"
            value={params.denoiseStrength ?? 1}
            onChange={handleChange}
            min="0"
            max="1"
            step="0.01"
            className="w-full accent-blue-600 dark:accent-blue-400"
          />
        </div>
        {/* Seed と Total Second Length を常に表示されるエリアに移動 */}
        <div>
          <label
            htmlFor="seed"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Seed (-1 for random)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="number"
              name="seed"
              id="seed"
              value={params.seed}
              onChange={handleChange}
              min="-1"
              step="1"
              className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() =>
                setParams({
                  seed: Math.floor(Math.random() * 2 ** 32),
                })
              }
              className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              title="Generate random seed"
            >
              🎲
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="total_second_length"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Total Second Length
          </label>
          <input
            type="number"
            name="total_second_length"
            id="total_second_length"
            value={params.total_second_length}
            onChange={handleChange}
            min="1"
            step="1"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* 詳細設定トグルボタン */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors pt-2"
      >
        <Sliders size={16} />
        <span>{showAdvanced ? "詳細設定を隠す" : "詳細設定を表示"}</span>
      </button>

      {/* 詳細設定エリア */}
      {showAdvanced && (
        <div className="space-y-4 dark:border-gray-800">
          <div>
            <label
              htmlFor="video-enhance-system-prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              動画プロンプト拡張指示 (System Prompt)
            </label>
            <textarea
              id="video-enhance-system-prompt"
              rows={3}
              value={videoEnhanceSystemPrompt}
              onChange={(e) => setVideoEnhanceSystemPrompt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="例: Expand the input into a prompt suitable for video generation..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              プロンプト拡張時にAIに与える指示を入力します。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParameterSettings;
