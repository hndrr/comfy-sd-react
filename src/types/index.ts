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
  imageUrl: string;
  params: ComfyUIParams;
  timestamp: number;
}

export interface ApiResponse {
  status: string;
  data?: any;
  error?: string;
}