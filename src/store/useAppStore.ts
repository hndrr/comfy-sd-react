import { create } from "zustand";
import { ImageFile, ComfyUIParams, GenerationResult } from "../types";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";

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
  generatedVideoUrl: string | null;
  setGeneratedVideoUrl: (url: string | null) => void;
  videoError: string | null;
  setVideoError: (error: string | null) => void;
  isConnectionSettingsOpen: boolean;
  toggleConnectionSettings: () => void;

  isPreviewModalOpen: boolean;
  previewImageUrl: string | null;
  openPreviewModal: (url: string) => void;
  closePreviewModal: () => void;

  selectedSourceImage: string | null;
  setSelectedSourceImage: (imageUrl: string | null) => void;

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
  addResult: (result) => {
    set((state) => {
      const newResults = [result, ...state.results];
      saveResults(newResults);
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

  progress: null,
  setProgress: (progress) => set({ progress }),

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
      generatedVideoUrl: null,
      videoError: null,
    }),

  generatedVideoUrl: null,
  setGeneratedVideoUrl: (url) =>
    set({ generatedVideoUrl: url, isGeneratingVideo: false }),

  videoError: null,
  setVideoError: (error) =>
    set({ videoError: error, isGeneratingVideo: false }),

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

  selectedSourceImage: null,
  setSelectedSourceImage: (imageUrl) => set({ selectedSourceImage: imageUrl }),

  activeTab: "image",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
