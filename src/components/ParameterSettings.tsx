import React from "react";

export interface GenerationParams {
  steps: number;
  cfgScale: number;
  motionStrength: number;
  fps: number;
  seed: number; // 追加
  total_second_length: number; // 追加
}

interface ParameterSettingsProps {
  params: GenerationParams;
  setParams: (params: GenerationParams) => void;
}

const ParameterSettings: React.FC<ParameterSettingsProps> = ({
  params,
  setParams,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setParams({
      ...params,
      [name]: Number(value), // Convert value to number
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="col-span-full text-lg font-medium mb-2 text-gray-900 dark:text-white">
        Generation Parameters
      </h3>
      <div>
        <label
          htmlFor="steps"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300" // ダークモード文字色追加
        >
          Steps
        </label>
        <input
          type="number"
          name="steps"
          id="steps"
          value={params.steps}
          onChange={handleChange}
          min="1"
          max="100" // Example max value
          step="1"
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // ダークモードスタイル追加
        />
      </div>
      <div>
        <label
          htmlFor="cfgScale"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300" // ダークモード文字色追加
        >
          CFG Scale
        </label>
        <input
          type="number"
          name="cfgScale"
          id="cfgScale"
          value={params.cfgScale}
          onChange={handleChange}
          min="1"
          max="20" // Example max value
          step="0.1"
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // ダークモードスタイル追加
        />
      </div>
      <div>
        <label
          htmlFor="motionStrength"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300" // ダークモード文字色追加
        >
          Motion Strength
        </label>
        <input
          type="number"
          name="motionStrength"
          id="motionStrength"
          value={params.motionStrength}
          onChange={handleChange}
          min="0"
          max="1" // Example max value (0 to 1)
          step="0.05"
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // ダークモードスタイル追加
        />
      </div>
      <div>
        <label
          htmlFor="fps"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300" // ダークモード文字色追加
        >
          Frames Per Second (FPS)
        </label>
        <input
          type="number"
          name="fps"
          id="fps"
          value={params.fps}
          onChange={handleChange}
          min="1"
          max="60" // Example max value
          step="1"
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // ダークモードスタイル追加
        />
      </div>
      <div>
        <label
          htmlFor="seed"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300" // ダークモード文字色追加
        >
          Seed (-1 for random)
        </label>
        <input
          type="number"
          name="seed"
          id="seed"
          value={params.seed}
          onChange={handleChange}
          min="-1"
          step="1"
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // ダークモードスタイル追加
        />
      </div>
      <div>
        <label
          htmlFor="total_second_length"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300" // ダークモード文字色追加
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
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" // ダークモードスタイル追加
        />
      </div>
    </div>
  );
};

export default ParameterSettings;
