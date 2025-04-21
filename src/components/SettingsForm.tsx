import { Sliders, Zap } from "lucide-react";
import React, { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateRandomSeed } from "../utils/imageHelpers";

const samplers = [
  { value: "euler_a", label: "Euler Ancestral" },
  { value: "euler", label: "Euler" },
  { value: "ddim", label: "DDIM" },
  { value: "dpm_2", label: "DPM Solver 2" },
  { value: "dpm_2_a", label: "DPM Solver 2 Ancestral" },
  { value: "dpm++_2s_a", label: "DPM++ 2S Ancestral" },
  { value: "dpmpp_2m", label: "DPM++ 2M" },
  { value: "dpm++_sde", label: "DPM++ SDE" },
  { value: "dpm_fast", label: "DPM Fast" },
  { value: "dpm_adaptive", label: "DPM Adaptive" },
  { value: "lms", label: "LMS" },
  { value: "heun", label: "Heun" },
];

const SettingsForm: React.FC = () => {
  // useAppStore からモデル関連の状態とアクションを取得
  const {
    params,
    updateParams,
    checkpointList,
    loraList,
    selectedCheckpoint,
    selectedLora,
    loraStrength,
    setSelectedCheckpoint,
    setSelectedLora,
    setLoraStrength,
    modelListError, // エラー表示用
  } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRandomSeed = () => {
    updateParams({ seed: generateRandomSeed() });
  };

  // LoRAが選択されているかどうかの判定
  const isLoraSelected = selectedLora && selectedLora !== "None";

  return (
    <div className="w-full space-y-6">
      <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
        生成パラメータ
      </h2>

      {/* モデルリスト取得エラー表示 */}
      {modelListError && (
        <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-md text-red-700 dark:text-red-200 text-sm">
          {modelListError}
        </div>
      )}

      <div className="space-y-4">
        {/* --- モデル選択 UI --- */}
        <div>
          <label
            htmlFor="checkpoint"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            チェックポイントモデル
          </label>
          <select
            id="checkpoint"
            value={selectedCheckpoint ?? ""} // null の場合は空文字
            onChange={(e) => setSelectedCheckpoint(e.target.value || null)}
            disabled={checkpointList.length === 0} // リストが空なら無効化
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
          >
            {checkpointList.length === 0 && <option>読み込み中...</option>}
            {checkpointList.map((ckpt) => (
              <option key={ckpt} value={ckpt}>
                {ckpt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="lora"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            LoRAモデル
          </label>
          <select
            id="lora"
            value={selectedLora ?? "None"} // null の場合は "None"
            onChange={(e) => setSelectedLora(e.target.value)}
            disabled={loraList.length <= 1} // "None" しかない場合は無効化
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
          >
            {loraList.length <= 1 && <option>読み込み中...</option>}
            {loraList.map((lora) => (
              <option key={lora} value={lora}>
                {lora}
              </option>
            ))}
          </select>
        </div>

        {/* LoRA強度 (LoRA選択時のみ表示) */}
        {isLoraSelected && (
          <div>
            <label
              htmlFor="loraStrength"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              LoRA強度: {loraStrength.toFixed(2)}
            </label>
            <input
              id="loraStrength"
              type="range"
              min="0"
              max="2" // 強度は 0 から 2 の範囲など（適宜調整）
              step="0.05"
              value={loraStrength}
              onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-400"
            />
             <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>弱い (0.0)</span>
              <span>強い (2.0)</span>
            </div>
          </div>
        )}
        {/* --- ここまでモデル選択 UI --- */}


        {/* プロンプトとネガティブプロンプトの入力欄を削除 */}
        <div>
          <label
            htmlFor="denoiseStrength"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            ノイズ強度: {params.denoiseStrength.toFixed(2)}
          </label>
          <input
            id="denoiseStrength"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.denoiseStrength}
            onChange={(e) =>
              updateParams({ denoiseStrength: parseFloat(e.target.value) })
            }
            className="w-full accent-blue-600 dark:accent-blue-400"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>元画像に忠実（0.0）</span>
            <span>完全に新しく（1.0）</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Sliders size={16} />
          <span>{showAdvanced ? "詳細設定を隠す" : "詳細設定を表示"}</span>
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div>
              <label
                htmlFor="steps"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                ステップ数: {params.steps}
              </label>
              <input
                id="steps"
                type="range"
                min="1"
                max="50"
                step="1"
                value={params.steps}
                onChange={(e) =>
                  updateParams({ steps: parseInt(e.target.value) })
                }
                className="w-full accent-blue-600 dark:accent-blue-400"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>速い（低品質）</span>
                <span>遅い（高品質）</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="cfg"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                CFG強度: {params.cfg.toFixed(1)}
              </label>
              <input
                id="cfg"
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={params.cfg}
                onChange={(e) =>
                  updateParams({ cfg: parseFloat(e.target.value) })
                }
                className="w-full accent-blue-600 dark:accent-blue-400"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>創造的</span>
                <span>プロンプトに忠実</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="sampler"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                サンプラー
              </label>
              <select
                id="sampler"
                value={params.sampler}
                onChange={(e) => updateParams({ sampler: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {samplers.map((sampler) => (
                  <option key={sampler.value} value={sampler.value}>
                    {sampler.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="seed"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                シード値
              </label>
              <div className="flex space-x-2">
                <input
                  id="seed"
                  type="number"
                  value={params.seed}
                  onChange={(e) =>
                    updateParams({ seed: parseInt(e.target.value) })
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="-1でランダム"
                />
                <button
                  type="button"
                  onClick={handleRandomSeed}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  aria-label="ランダムシード値を生成"
                >
                  <Zap size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                同じシード値は同じ結果を生成します。-1でランダム値になります。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsForm;
