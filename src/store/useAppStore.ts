import { create } from "zustand";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";
import { ComfyUIParams, GenerationResult, ImageFile } from "../types";

interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  sourceImage: ImageFile;
  setSourceImage: (image: ImageFile) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
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
  progress: number | null;
  setProgress: (progress: number | null) => void;

  videoPrompt: string;
  setVideoPrompt: (prompt: string) => void;
  videoGenerationParams: VideoGenerationParams;
  setVideoGenerationParams: (params: Partial<VideoGenerationParams>) => void;
  videoSourceImage: ImageFile;
  setVideoSourceImage: (image: ImageFile) => void;
  isGeneratingVideo: boolean;
  setIsGeneratingVideo: (value: boolean) => void;
  // generatedVideoUrl: string | null; // 不要になるため削除
  // setGeneratedVideoUrl: (url: string | null) => void; // 不要になるため削除
  videoError: string | null;
  setVideoError: (error: string | null) => void;
  videoProgress: number | null; // 動画生成の進捗
  setVideoProgress: (progress: number | null) => void; // 追加: 動画生成の進捗を更新するアクション
  isConnectionSettingsOpen: boolean;
  toggleConnectionSettings: () => void;

  isPreviewModalOpen: boolean;
  previewImageUrl: string | null;
  openPreviewModal: (url: string) => void;
  closePreviewModal: () => void;
 
  // 動画プレビューモーダル用 state と アクション
  isVideoPreviewModalOpen: boolean;
  previewVideoUrl: string | null;
  openVideoPreviewModal: (url: string) => void;
  closeVideoPreviewModal: () => void;
 
  selectedSourceImage: string | null; // これは画像生成のソース選択用？ 一旦残す
  setSelectedSourceImage: (imageUrl: string | null) => void; // 同上

  activeTab: "image" | "video";
  setActiveTab: (tab: "image" | "video") => void;
}

const DEFAULT_PARAMS: ComfyUIParams = {
  prompt: "photos, high resolution, super detailed, beautiful lighting",
  negativePrompt:
    "Low resolution, blurred, pixelated, poor resolution, poor quality",
  denoiseStrength: 0.7,
  steps: 20,
  cfg: 7,
  sampler: "dpmpp_2m",
  seed: -1,
};

const DEFAULT_VIDEO_PARAMS: VideoGenerationParams = {
  steps: 30,
  cfgScale: 1,
  motionStrength: 0.15,
  fps: 24,
  seed: -1,
  total_second_length: 1,
};

const loadResults = (): GenerationResult[] => {
  try {
    const savedResults = localStorage.getItem("comfyui-results");
    return savedResults ? JSON.parse(savedResults) : [];
  } catch (e) {
    console.error("結果の読み込みに失敗しました", e);
    return [];
  }
};

const saveResults = (results: GenerationResult[]) => {
  try {
    localStorage.setItem("comfyui-results", JSON.stringify(results));
  } catch (e) {
    console.error("結果の保存に失敗しました", e);
  }
};

export const useAppStore = create<AppState>((set) => ({
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  sourceImage: {
    file: null,
    preview: "",
  },
  setSourceImage: (image) => set({ sourceImage: image }),

  prompt: DEFAULT_PARAMS.prompt,
  setPrompt: (prompt) => set({ prompt }),

  params: DEFAULT_PARAMS,
  updateParams: (newParams) =>
    set((state) => ({
      params: { ...state.params, ...newParams },
    })),

  isGenerating: false,
  setIsGenerating: (value) =>
    set({ isGenerating: value, progress: value ? 0 : null, error: null }),

  results: loadResults(),
  addResult: (result: GenerationResult) => { // 型を明示
    set((state) => {
      const newResults = [result, ...state.results];
      saveResults(newResults);
      // 結果のタイプに応じて、対応する生成中フラグとプログレスをリセット
      const updates: Partial<AppState> = { results: newResults };
      if (result.type === "image") {
        updates.isGenerating = false;
        updates.progress = null;
      } else if (result.type === "video") {
        updates.isGeneratingVideo = false;
        updates.videoProgress = null;
      }
      return updates;
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

  progress: null,
  setProgress: (progress) => set({ progress }),

  videoProgress: null, // 追加: 動画生成の進捗初期値
  setVideoProgress: (progress) => set({ videoProgress: progress }), // 追加: 動画生成の進捗更新アクション

  videoPrompt: "A cinematic shot of dinosaurs moving violently to intimidate",
  setVideoPrompt: (prompt) => set({ videoPrompt: prompt }),

  videoGenerationParams: DEFAULT_VIDEO_PARAMS,
  setVideoGenerationParams: (newParams) =>
    set((state) => ({
      videoGenerationParams: { ...state.videoGenerationParams, ...newParams },
    })),

  isGeneratingVideo: false,
  setIsGeneratingVideo: (value) =>
    set({
      isGeneratingVideo: value,
      // generatedVideoUrl: null, // 削除
      videoError: null,
      videoProgress: value ? 0 : null, // 開始時に0、終了/エラー時にnull (addResult/setVideoErrorで処理)
    }),

  // generatedVideoUrl: null, // 削除
  // setGeneratedVideoUrl: (url) => // 削除 (addResult で結果を追加)
  //   set({
  //     // generatedVideoUrl: url, // 削除
  //     isGeneratingVideo: false,
  //     videoProgress: null,
  //   }),
 
  videoError: null,
  setVideoError: (error) => // エラー発生時に isGeneratingVideo と progress をリセット
    set({
      videoError: error,
      isGeneratingVideo: false,
      videoProgress: null, // 追加: エラー時にnull
    }),

  videoSourceImage: {
    file: null,
    preview: "",
  },
  setVideoSourceImage: (image) => set({ videoSourceImage: image }),

  isConnectionSettingsOpen: false,
  toggleConnectionSettings: () =>
    set((state) => ({
      isConnectionSettingsOpen: !state.isConnectionSettingsOpen,
    })),

  isPreviewModalOpen: false,
  previewImageUrl: null,
  openPreviewModal: (url) =>
    set({ isPreviewModalOpen: true, previewImageUrl: url }),
  closePreviewModal: () =>
    set({ isPreviewModalOpen: false, previewImageUrl: null }),
 
  // 動画プレビューモーダル用 state と アクションの実装
  isVideoPreviewModalOpen: false,
  previewVideoUrl: null,
  openVideoPreviewModal: (url) =>
    set({ isVideoPreviewModalOpen: true, previewVideoUrl: url }),
  closeVideoPreviewModal: () =>
    set({ isVideoPreviewModalOpen: false, previewVideoUrl: null }),
 
  selectedSourceImage: null,
  setSelectedSourceImage: (imageUrl) => set({ selectedSourceImage: imageUrl }),

  activeTab: "image",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
