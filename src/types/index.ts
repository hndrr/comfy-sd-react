
// VideoGenerationParams の定義をここに移動
export interface VideoGenerationParams {
  steps: number;
  cfgScale: number; // ComfyUIParams と共通化も検討
  fps: number;
  seed: number;
  total_second_length: number;
  denoiseStrength: number;
}

export interface ImageFile {
  file: File | null;
  preview: string;
}

// ComfyUIParams にモデル選択関連のプロパティを追加
export interface ComfyUIParams {
  prompt: string;
  negativePrompt: string;
  denoiseStrength: number;
  steps: number;
  cfg: number;
  sampler: string;
  seed: number;
  width: number;
  height: number;
  selectedCheckpoint: string | null; // 追加 (null 許容)
  selectedLora?: string | null; // 追加 (オプショナル)
  loraStrength?: number; // 追加 (オプショナル)
}

export interface GenerationResult {
  id: string;
  prompt: string; // 生成に使用したプロンプト
  params: ComfyUIParams | VideoGenerationParams; // 画像または動画パラメータ
  timestamp: number;
  type: "image" | "video"; // 結果のタイプ (必須)
  imageUrl?: string; // 画像の場合のURL
  videoUrl?: string; // 動画の場合のURL
  thumbnailUrl?: string; // 動画のサムネイルURL (オプション)
}

export interface ApiResponse {
  status: string;
  data?: string | GenerationResult | Record<string, unknown>; // string (imageUrl), GenerationResult (video), or generic object (stats)
  error?: string;
}
