import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings"; // 動画パラメータ型をインポート

export interface ImageFile {
  file: File | null;
  preview: string;
}

export interface ComfyUIParams {
  prompt: string;
  negativePrompt: string;
  denoiseStrength: number;
  steps: number;
  cfg: number;
  sampler: string;
  seed: number;
}

export interface GenerationResult {
  id: string;
  imageUrl: string; // 画像または動画のURL
  prompt: string; // 生成に使用したプロンプト
  params: ComfyUIParams | VideoGenerationParams; // 画像または動画パラメータ
  timestamp: number;
  type?: "image" | "video"; // 結果のタイプ (オプション)
}

export interface ApiResponse {
  status: string;
  data?: string | GenerationResult | Record<string, unknown>; // string (imageUrl), GenerationResult (video), or generic object (stats)
  error?: string;
}
