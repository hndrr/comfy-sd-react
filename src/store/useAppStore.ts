import { create } from "zustand";
import { ImageFile, ComfyUIParams, GenerationResult } from "../types";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings"; // 動画生成パラメータの型をインポート

interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  sourceImage: ImageFile;
  setSourceImage: (image: ImageFile) => void;
  params: ComfyUIParams;
  updateParams: (params: Partial<ComfyUIParams>) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  results: GenerationResult[];
  addResult: (result: GenerationResult) => void;
  removeResult: (id: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  progress: number | null; // 進捗状況 (0-1) または null
  setProgress: (progress: number | null) => void; // 進捗更新アクション

  // --- Video Generation State ---
  videoPrompt: string;
  setVideoPrompt: (prompt: string) => void;
  videoGenerationParams: VideoGenerationParams;
  setVideoGenerationParams: (params: Partial<VideoGenerationParams>) => void;
  videoSourceImage: ImageFile; // 動画生成用ソース画像
  setVideoSourceImage: (image: ImageFile) => void; // 動画生成用ソース画像アクション
  isGeneratingVideo: boolean;
  setIsGeneratingVideo: (value: boolean) => void;
  generatedVideoUrl: string | null;
  setGeneratedVideoUrl: (url: string | null) => void;
  videoError: string | null;
  setVideoError: (error: string | null) => void;
}

const DEFAULT_PARAMS: ComfyUIParams = {
  prompt: "写真、高解像度、超詳細、美しい照明",
  negativePrompt: "低解像度、ぼやけている、ピクセル化、悪い解像度、質の悪い",
  denoiseStrength: 0.7,
  steps: 20,
  cfg: 7,
  sampler: "dpmpp_2m", // ユーザー環境に合わせたデフォルトサンプラー
  seed: -1,
};

const DEFAULT_VIDEO_PARAMS: VideoGenerationParams = {
  steps: 30, // デフォルト値 (JSONワークフローから)
  cfgScale: 1, // デフォルト値 (JSONワークフローから)
  motionStrength: 0.15, // デフォルト値 (JSONワークフローから)
  fps: 24, // デフォルト値 (JSONワークフローから)
  seed: -1, // 追加 (JSONワークフローから)
  total_second_length: 1, // 追加 (JSONワークフローから widget 12)
};

// LocalStorageから結果を読み込む
const loadResults = (): GenerationResult[] => {
  try {
    const savedResults = localStorage.getItem("comfyui-results");
    return savedResults ? JSON.parse(savedResults) : [];
  } catch (e) {
    console.error("結果の読み込みに失敗しました", e);
    return [];
  }
};

// LocalStorageに結果を保存
const saveResults = (results: GenerationResult[]) => {
  try {
    localStorage.setItem("comfyui-results", JSON.stringify(results));
  } catch (e) {
    console.error("結果の保存に失敗しました", e);
  }
};

export const useAppStore = create<AppState>((set) => ({
  // 未使用の 'get' を削除
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  sourceImage: {
    file: null,
    preview: "",
  },
  setSourceImage: (image) => set({ sourceImage: image }),

  params: DEFAULT_PARAMS,
  updateParams: (newParams) =>
    set((state) => ({
      params: { ...state.params, ...newParams },
    })),

  isGenerating: false,
  // 生成開始/終了時に進捗もリセット
  setIsGenerating: (value) =>
    set({ isGenerating: value, progress: value ? 0 : null, error: null }),

  results: loadResults(),
  // 結果追加時（正常完了時）に進捗をリセット
  addResult: (result) => {
    set((state) => {
      const newResults = [result, ...state.results];
      saveResults(newResults);
      // 完了したので isGenerating: false, progress: null にする
      return { results: newResults, isGenerating: false, progress: null };
    });
  },
  removeResult: (id) => {
    set((state) => {
      const newResults = state.results.filter((result) => result.id !== id);
      saveResults(newResults);
      return { results: newResults };
    });
  },

  error: null,
  setError: (error) => set({ error }),

  apiUrl: localStorage.getItem("comfyui-api-url") || "http://127.0.0.1:8188",
  setApiUrl: (url) => {
    localStorage.setItem("comfyui-api-url", url);
    set({ apiUrl: url });
  },

  progress: null, // 初期状態は null
  setProgress: (progress) => set({ progress }), // 進捗更新

  // --- Video Generation Actions ---
  videoPrompt: "A cinematic shot of dinosaurs moving violently to intimidate", // デフォルトプロンプト例
  setVideoPrompt: (prompt) => set({ videoPrompt: prompt }),

  videoGenerationParams: DEFAULT_VIDEO_PARAMS,
  setVideoGenerationParams: (newParams) =>
    set((state) => ({
      videoGenerationParams: { ...state.videoGenerationParams, ...newParams },
    })),

  isGeneratingVideo: false,
  // 動画生成開始/終了時にエラーと結果URLをリセット
  setIsGeneratingVideo: (value) =>
    set({
      isGeneratingVideo: value,
      generatedVideoUrl: null,
      videoError: null,
    }),

  generatedVideoUrl: null,
  setGeneratedVideoUrl: (url) =>
    set({ generatedVideoUrl: url, isGeneratingVideo: false }), // 結果セット時に生成中フラグをfalseに

  videoError: null,
  setVideoError: (error) =>
    set({ videoError: error, isGeneratingVideo: false }), // エラーセット時に生成中フラグをfalseに

  videoSourceImage: {
    // 動画生成用ソース画像の初期状態
    file: null,
    preview: "",
  },
  setVideoSourceImage: (image) => set({ videoSourceImage: image }), // 動画生成用ソース画像アクション
}));
