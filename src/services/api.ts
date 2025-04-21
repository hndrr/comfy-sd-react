import { ComfyApi } from "@saintno/comfyui-sdk";
import type {
  ImageInfo,
  TEventStatus,
  TProgress,
  TExecuting,
  TExecuted,
  TExecutionError,
  TExecutionInterrupted,
} from "@saintno/comfyui-sdk";
import { ComfyUIParams, ApiResponse, GenerationResult } from "../types";
import { useAppStore } from "../store/useAppStore";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";
import videoWorkflowTemplate from "./videoWorkflowTemplate.json";

let comfyApiInstance: ComfyApi | null = null;

const getComfyApi = (): ComfyApi => {
  const { apiUrl } = useAppStore.getState();
  if (!apiUrl) {
    throw new Error("ComfyUI API URL is not configured.");
  }
  if (!comfyApiInstance || comfyApiInstance.apiHost !== apiUrl) {
    const clientId = `comfy-sd-react-${Date.now()}`;
    console.log(
      `Creating/Recreating ComfyApi instance for ${apiUrl} with clientId ${clientId}`
    );
    comfyApiInstance = new ComfyApi(apiUrl, clientId);
  }
  return comfyApiInstance;
};

// --- API Service (Using low-level queuePrompt and WebSocket listeners) ---
export const comfyUIApi = {
  async checkStatus(): Promise<ApiResponse> {
    try {
      const api = getComfyApi();
      await api.pollStatus(5000);
      return { status: "success", data: { message: "接続成功" } };
    } catch (error) {
      console.error("APIステータスの確認に失敗しました (SDK)", error);
      const errorMessage =
        error instanceof Error ? error.message : "不明な接続エラー";
      return {
        status: "error",
        error: `接続に失敗しました: ${errorMessage}`,
      };
    }
  },

  async processImage(
    imageFile: File,
    params: ComfyUIParams,
    onProgress?: (progress: number | null) => void
  ): Promise<ApiResponse> {
    try {
      const api = getComfyApi();

      console.log(`Uploading image: ${imageFile.name}`);
      const uploadedImage = await api.uploadImage(imageFile, imageFile.name, {
        override: true,
      });
      if (!uploadedImage || !uploadedImage.info) {
        throw new Error("画像のアップロードに失敗しました。");
      }
      const imagePath = uploadedImage.info.filename;
      console.log(`Image uploaded successfully: ${imagePath}`);

      const i2iWorkflow = {
        "1": {
          _meta: { title: "Load Checkpoint" },
          class_type: "CheckpointLoaderSimple",
          inputs: {
            ckpt_name:
              /*params.checkpoint ||*/ "v1-5-pruned-emaonly-fp16.safetensors",
          },
        },
        "2": {
          _meta: { title: "Positive Prompt" },
          class_type: "CLIPTextEncode",
          inputs: { text: params.prompt, clip: ["1", 1] },
        },
        "3": {
          _meta: { title: "Negative Prompt" },
          class_type: "CLIPTextEncode",
          inputs: { text: params.negativePrompt, clip: ["1", 1] },
        },
        "4": {
          _meta: { title: "Load Image" },
          class_type: "LoadImage",
          inputs: { image: imagePath },
        },
        "5": {
          _meta: { title: "VAE Encode" },
          class_type: "VAEEncode",
          inputs: { pixels: ["4", 0], vae: ["1", 2] },
        },
        "6": {
          _meta: { title: "KSampler" },
          class_type: "KSampler",
          inputs: {
            seed:
              params.seed < 0
                ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
                : params.seed,
            steps: params.steps,
            cfg: params.cfg,
            sampler_name: params.sampler,
            scheduler: "normal",
            denoise: params.denoiseStrength,
            model: ["1", 0],
            positive: ["2", 0],
            negative: ["3", 0],
            latent_image: ["5", 0],
          },
        },
        "7": {
          _meta: { title: "VAE Decode" },
          class_type: "VAEDecode",
          inputs: { samples: ["6", 0], vae: ["1", 2] },
        },
        "8": {
          _meta: { title: "Save Image" },
          class_type: "SaveImage",
          inputs: { filename_prefix: "img2img_result", images: ["7", 0] },
        },
      };

      // 3. Queue Prompt and Wait
      console.log("Queueing image generation workflow...");
      const queueResponse = await api.queuePrompt(null, i2iWorkflow);
      if (!queueResponse?.prompt_id) {
        throw new Error("プロンプトのキューイングに失敗しました。");
      }
      const promptId = queueResponse.prompt_id;
      console.log(`Image generation queued (Prompt ID: ${promptId})`);

      const history = await waitForPromptExecution(api, promptId, onProgress);

      // 4. Extract Result with type guard (avoiding 'any')
      let outputs: Record<string, unknown> | undefined; // Use unknown instead of any
      if (
        typeof history === "object" &&
        history !== null &&
        "outputs" in history &&
        typeof (history as { outputs?: unknown }).outputs === "object" // Safer cast for check
      ) {
        outputs = (history as { outputs: Record<string, unknown> }).outputs; // Cast to access
      }

      if (!outputs) {
        throw new Error("実行履歴から出力が見つかりませんでした。");
      }
      const saveImageNodeId = "8";
      const imageData = outputs[saveImageNodeId] as
        | { images?: ImageInfo[] }
        | undefined;
      const imageInfo = imageData?.images?.[0]; // Optional chaining

      if (!imageInfo) {
        console.error(
          "Generated image data not found in history output:",
          outputs
        );
        throw new Error("生成された画像データが見つかりませんでした。");
      }

      const imageUrl = api.getPathImage(imageInfo);
      console.log(`Generated image URL: ${imageUrl}`);

      const generationResult: GenerationResult = {
        id: promptId,
        imageUrl: imageUrl,
        prompt: params.prompt,
        params: params,
        timestamp: Date.now(),
        type: "image",
      };
      return { status: "success", data: generationResult };
    } catch (error) {
      console.error("画像処理中に予期せぬエラーが発生しました (SDK)", error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      return { status: "error", error: `画像処理エラー: ${errorMessage}` };
    }
  },

  async generateVideo(
    imageFile: File,
    prompt: string,
    videoParams: VideoGenerationParams,
    onProgress?: (progress: number | null) => void
  ): Promise<ApiResponse> {
    try {
      const api = getComfyApi();

      // 1. Upload Image
      console.log(`Uploading image for video: ${imageFile.name}`);
      const uploadedImage = await api.uploadImage(imageFile, imageFile.name, {
        override: true,
      });
      if (!uploadedImage || !uploadedImage.info) {
        throw new Error("動画用画像のアップロードに失敗しました。");
      }
      const imagePath = uploadedImage.info.filename;
      console.log(`Image for video uploaded successfully: ${imagePath}`);

      // 2. Prepare Workflow Object
      const videoWorkflow = JSON.parse(JSON.stringify(videoWorkflowTemplate));

      // --- Manually insert values ---
      if (videoWorkflow["19"]) {
        videoWorkflow["19"].inputs.image = imagePath;
      } else {
        console.warn("Node 19 (LoadImage) not found");
      }
      if (videoWorkflow["47"]) {
        videoWorkflow["47"].inputs.text = prompt;
      } else {
        console.warn("Node 47 (CLIPTextEncode) not found");
      }
      if (videoWorkflow["39"]) {
        videoWorkflow["39"].inputs.steps = videoParams.steps;
        videoWorkflow["39"].inputs.motion_strength = videoParams.motionStrength;
        videoWorkflow["39"].inputs.cfg = videoParams.cfgScale;
        videoWorkflow["39"].inputs.seed =
          videoParams.seed < 0
            ? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
            : videoParams.seed;
        videoWorkflow["39"].inputs.total_second_length =
          videoParams.total_second_length;
      } else {
        console.warn("Node 39 (FramePackSampler) not found");
      }
      if (videoWorkflow["23"]) {
        videoWorkflow["23"].inputs.frame_rate = videoParams.fps;
      } else {
        console.warn("Node 23 (VHS_VideoCombine) not found");
      }
      // --- End of manual insertion ---

      // 3. Queue Prompt and Wait
      console.log("Queueing video generation workflow...");
      const queueResponse = await api.queuePrompt(null, videoWorkflow);
      if (!queueResponse?.prompt_id) {
        throw new Error("動画プロンプトのキューイングに失敗しました。");
      }
      const promptId = queueResponse.prompt_id;
      console.log(`Video generation queued (Prompt ID: ${promptId})`);

      const history = await waitForPromptExecution(api, promptId, onProgress);

      // 4. Extract Result with type guard (avoiding 'any')
      let outputs: Record<string, unknown> | undefined; // Use unknown instead of any
      if (
        typeof history === "object" &&
        history !== null &&
        "outputs" in history &&
        typeof (history as { outputs?: unknown }).outputs === "object" // Safer cast for check
      ) {
        // We know 'outputs' exists and is an object (or null) here
        outputs = (history as { outputs: Record<string, unknown> }).outputs; // Cast to access
      }

      if (!outputs) {
        throw new Error("実行履歴から出力が見つかりませんでした。");
      }
      const videoCombineNodeId = "23";
      // Accessing outputs requires casting or further checks if using unknown
      const videoData = outputs[videoCombineNodeId] as
        | { videos?: ImageInfo[]; gifs?: ImageInfo[] }
        | undefined;
      const outputArray = videoData?.videos || videoData?.gifs;
      const videoInfo = outputArray?.[0]; // Optional chaining

      if (!videoInfo) {
        console.error(
          "Generated video data not found in history output:",
          outputs
        );
        throw new Error("生成された動画データが見つかりませんでした。");
      }

      const videoUrl = api.getPathImage(videoInfo);
      console.log(`Generated video URL: ${videoUrl}`);

      const generationResult: GenerationResult = {
        id: promptId,
        imageUrl: videoUrl,
        prompt: prompt,
        params: videoParams,
        timestamp: Date.now(),
        type: "video",
      };
      return { status: "success", data: generationResult };
    } catch (error) {
      console.error("動画生成中に予期せぬエラーが発生しました (SDK)", error);
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      return { status: "error", error: `動画生成エラー: ${errorMessage}` };
    }
  },
};

// --- WebSocket Helper Function ---
async function waitForPromptExecution(
  api: ComfyApi,
  promptId: string,
  onProgress?: (progress: number | null) => void,
  timeoutMs: number = 600000
): Promise<unknown> {
  // Use unknown instead of any
  return new Promise((resolve, reject) => {
    let timeoutId: number | null = null;
    let lastStatus: TEventStatus["status"] | null = null;

    const cleanUpListeners = () => {
      if (timeoutId) clearTimeout(timeoutId);
      api.off("status", statusListener);
      api.off("progress", progressListener);
      api.off("executing", executingListener);
      api.off("executed", executedListener);
      api.off("execution_error", errorListener);
      api.off("execution_interrupted", interruptedListener);
      if (onProgress) onProgress(null);
    };

    const statusListener = (event: CustomEvent<TEventStatus>) => {
      lastStatus = event.detail.status;
      if (lastStatus?.exec_info?.queue_remaining === 0) {
        /* Potentially finished */
      }
    };

    const progressListener = (event: CustomEvent<TProgress>) => {
      const data = event.detail;
      if (data.prompt_id === promptId && onProgress) {
        const progressValue = data.value / data.max;
        onProgress(progressValue);
      }
    };

    const executingListener = (event: CustomEvent<TExecuting>) => {
      const data = event.detail;
      if (data.prompt_id === promptId && data.node === null) {
        console.log(`Executing event with null node (Prompt ID: ${promptId})`);
      }
    };

    const executedListener = async (event: CustomEvent<TExecuted<unknown>>) => {
      const data = event.detail;
      if (data.prompt_id === promptId) {
        console.log(`Execution finished (Prompt ID: ${promptId})`);
        cleanUpListeners();
        try {
          await new Promise((res) => setTimeout(res, 500));
          const history = await api.getHistory(promptId);
          // Use unknown and type guard before indexing
          const historyUnknown = history as unknown;
          if (
            typeof historyUnknown === "object" &&
            historyUnknown !== null &&
            promptId in historyUnknown
          ) {
            // We assume the value associated with promptId is what we need
            resolve((historyUnknown as Record<string, unknown>)[promptId]);
          } else {
            console.error(
              `History not found for Prompt ID: ${promptId}`,
              historyUnknown
            );
            reject(`実行履歴が見つかりませんでした (Prompt ID: ${promptId})`);
          }
        } catch (err) {
          console.error(
            `履歴の取得に失敗しました (Prompt ID: ${promptId})`,
            err
          );
          reject(
            `履歴の取得に失敗しました: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    };

    const errorListener = (event: CustomEvent<TExecutionError>) => {
      const data = event.detail;
      if (data.prompt_id === promptId) {
        console.error(`Execution error (Prompt ID: ${promptId}):`, data);
        cleanUpListeners();
        const errorMsg = data.exception_message || "不明なエラー";
        reject(`実行エラーが発生しました: ${errorMsg}`);
      }
    };

    const interruptedListener = (event: CustomEvent<TExecutionInterrupted>) => {
      const data = event.detail;
      if (data.prompt_id === promptId) {
        console.warn(`Execution interrupted (Prompt ID: ${promptId})`);
        cleanUpListeners();
        reject("処理が中断されました。");
      }
    };

    // Attach listeners
    api.on("status", statusListener);
    api.on("progress", progressListener);
    api.on("executing", executingListener);
    api.on("executed", executedListener);
    api.on("execution_error", errorListener);
    api.on("execution_interrupted", interruptedListener);

    // Start timeout
    timeoutId = setTimeout(() => {
      console.error(`Timeout waiting for execution (Prompt ID: ${promptId})`);
      cleanUpListeners();
      reject(`処理がタイムアウトしました (${timeoutMs / 1000}秒)`);
    }, timeoutMs);

    // Initial progress state
    if (onProgress) onProgress(0);
  });
}
