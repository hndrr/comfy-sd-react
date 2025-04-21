import { create } from "zustand";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";
// comfyUIApi をインポート
import { ComfyUIParams as ApiComfyUIParams, comfyUIApi } from "../services/api"; // api.ts から拡張された型もインポート
import { GenerationResult, ImageFile } from "../types";
// 元の ComfyUIParams 型もインポートしておく（必要に応じて）

// AppState インターフェースに新しい状態とアクションを追加
interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  sourceImage: ImageFile;
  setSourceImage: (image: ImageFile) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  // params の型を api.ts で拡張したものに合わせる
  params: ApiComfyUIParams;
  updateParams: (params: Partial<ApiComfyUIParams>) => void;
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
  videoError: string | null;
  setVideoError: (error: string | null) => void;
  videoProgress: number | null; // 動画生成の進捗
  setVideoProgress: (progress: number | null) => void;
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
 
  selectedSourceImage: string | null;
  setSelectedSourceImage: (imageUrl: string | null) => void; // 同上

  activeTab: "image" | "video";
  setActiveTab: (tab: "image" | "video") => void;

  // --- モデル選択機能の状態 ---
  checkpointList: string[];
  loraList: string[];
  selectedCheckpoint: string | null;
  selectedLora: string | null;
  loraStrength: number;
  modelListError: string | null; // モデルリスト取得エラー用

  // --- モデル選択機能のアクション ---
  fetchModelLists: () => Promise<void>;
  setSelectedCheckpoint: (checkpoint: string | null) => void;
  setSelectedLora: (lora: string | null) => void;
  setLoraStrength: (strength: number) => void;
}

// DEFAULT_PARAMS の型も ApiComfyUIParams に合わせる
const DEFAULT_PARAMS: ApiComfyUIParams = {
  prompt: "photos, high resolution, super detailed, beautiful lighting",
  negativePrompt:
    "Low resolution, blurred, pixelated, poor resolution, poor quality",
  denoiseStrength: 0.7,
  steps: 20,
  cfg: 7,
  sampler: "dpmpp_2m",
  seed: -1,
  width: 512, // 追加 (デフォルト値)
  height: 512, // 追加 (デフォルト値)
  // selectedCheckpoint は初期値 null またはデフォルト値を設定
  selectedCheckpoint: null, // 初期選択なし
  selectedLora: null, // 初期選択なし
  loraStrength: 0.8, // デフォルト強度
};

const DEFAULT_VIDEO_PARAMS: VideoGenerationParams = {
  steps: 30,
  cfgScale: 1,
  fps: 24,
  seed: -1,
  total_second_length: 1,
  denoiseStrength: 0.7, // 追加: denoiseStrength のデフォルト値
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

export const useAppStore = create<AppState>((set, get) => ({ // get を追加
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

  videoProgress: null,
  setVideoProgress: (progress) => set({ videoProgress: progress }),

  videoPrompt: "He/She is dancing passionately to the music.",
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
      videoError: null,
      videoProgress: value ? 0 : null, // 開始時に0、終了/エラー時にnull (addResult/setVideoErrorで処理)
    }),
 
  videoError: null,
  setVideoError: (error) => // エラー発生時に isGeneratingVideo と progress をリセット
    set({
      videoError: error,
      isGeneratingVideo: false,
      videoProgress: null,
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

  // --- モデル選択機能の初期値 ---
  checkpointList: [],
  loraList: [],
  selectedCheckpoint: null, // 初期選択なし
  selectedLora: null, // 初期選択なし
  loraStrength: 0.8,
  modelListError: null,

  // --- モデル選択機能のアクション実装 ---
  fetchModelLists: async () => {
    set({ modelListError: null }); // エラーをリセット
    try {
      const response = await comfyUIApi.getObjectInfo();
      if (response.status === "success" && response.data) {
        // response.data を any としてキャストして型エラーを回避 (ESLint警告を一時的に無視)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const objectInfo = response.data as any;
        // CheckpointLoaderSimple からチェックポイントリストを取得
        const checkpoints =
          objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
        // LoraLoader からLoRAリストを取得
        const loras = objectInfo.LoraLoader?.input?.required?.lora_name?.[0] || [];

        // 状態を更新
        set({
          checkpointList: checkpoints,
          // LoRAリストの先頭に "None" を追加
          loraList: ["None", ...loras],
        });

        // デフォルトのチェックポイントがリストにあれば設定
        const currentCheckpoint = get().params.selectedCheckpoint;
        if (!currentCheckpoint && checkpoints.length > 0) {
          // デフォルト値としてリストの最初の項目を設定するか、特定の名前を探す
          // ここではリストの最初の項目を設定
          set((state) => ({
             params: { ...state.params, selectedCheckpoint: checkpoints[0] }
          }));
        } else if (currentCheckpoint && !checkpoints.includes(currentCheckpoint)) {
           // 現在選択中のものがリストになければリセット
           set((state) => ({
             params: { ...state.params, selectedCheckpoint: checkpoints[0] || null }
           }));
        }

      } else {
        throw new Error(response.error || "モデル情報の取得に失敗しました。");
      }
    } catch (error) {
      console.error("モデルリストの取得中にエラーが発生しました:", error);
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました。";
      set({ modelListError: `モデルリストの取得に失敗しました: ${message}` });
    }
  },
  setSelectedCheckpoint: (checkpoint) =>
    set((state) => ({
      params: { ...state.params, selectedCheckpoint: checkpoint },
      selectedCheckpoint: checkpoint, // selectedCheckpoint 状態も更新
    })),
  setSelectedLora: (lora) =>
    set((state) => ({
      params: { ...state.params, selectedLora: lora },
      selectedLora: lora, // selectedLora 状態も更新
    })),
  setLoraStrength: (strength) =>
    set((state) => ({
      params: { ...state.params, loraStrength: strength },
      loraStrength: strength, // loraStrength 状態も更新
    })),
}));
