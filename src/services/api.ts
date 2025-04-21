import axios from "axios";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";
import { useAppStore } from "../store/useAppStore";
// 仮に ComfyUIParams をここで拡張します。後で src/types/index.ts に移動します。
import type { ComfyUIParams as OriginalComfyUIParams } from "../types"; // 元の型をインポート
import { ApiResponse, GenerationResult } from "../types";
import videoWorkflowTemplate from "./videoWorkflowTemplate.json";

// --- Helper Type Definitions ---
type WorkflowInput = {
  name: string;
  type: string;
  link: number | null;
  widget?: { name?: string };
};
type WorkflowOutput = { name: string; type: string; links: number[] | null };
type WorkflowNode = {
  id: number;
  type: string;
  widgets_values?: unknown[];
  inputs?: WorkflowInput[];
  outputs?: WorkflowOutput[];
  properties?: Record<string, unknown>;
};
type WorkflowLink = [number, number, number, number, number, string];
type Workflow = { nodes: WorkflowNode[]; links: WorkflowLink[] };
type ApiNodeInputs = Record<string, unknown>;
type ApiWorkflow = Record<
  string,
  { class_type: string; inputs: ApiNodeInputs }
>;

// src/types/index.ts で定義されるべき型をここで拡張
export interface ComfyUIParams extends OriginalComfyUIParams {
  selectedCheckpoint: string | null; // null を許容するように変更
  selectedLora?: string | null; // オプショナル
  loraStrength?: number; // オプショナル
}

// --- API Service ---
export const comfyUIApi = {
  async checkStatus(): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();
      if (!apiUrl) throw new Error("API URL is not set.");
      const response = await axios.get(`${apiUrl}/system_stats`);
      return { status: "success", data: response.data };
    } catch (error) {
      console.error("APIステータスの確認に失敗しました", error);
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました。";
      return {
        status: "error",
        error: `接続に失敗しました。APIのURLを確認してください。(${message})`,
      };
    }
  },

  // モデルリスト取得関数を追加
  async getObjectInfo(): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();
      if (!apiUrl) throw new Error("API URL is not set.");
      const response = await axios.get(`${apiUrl}/object_info`);
      return { status: "success", data: response.data };
    } catch (error) {
      console.error("モデル情報の取得に失敗しました", error);
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました。";
      return {
        status: "error",
        error: `モデル情報の取得に失敗しました。(${message})`,
      };
    }
  },

  async processImage(
    imageFile: File,
    params: ComfyUIParams, // 拡張された型を使用
    onProgress?: (progress: number | null) => void
  ): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();
      if (!apiUrl) throw new Error("API URL is not set.");

      // --- 画像アップロード ---
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("overwrite", "true"); // 上書きを許可

      const uploadResponse = await axios.post(
        `${apiUrl}/upload/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (uploadResponse.status !== 200 || !uploadResponse.data?.name) {
        console.error("Upload failed:", uploadResponse);
        return { status: "error", error: "画像のアップロードに失敗しました。" };
      }

      const uploadedImageName = uploadResponse.data.name;
      // ComfyUIのバージョンによってはsubfolderがない場合があるため、安全に処理
      const subfolder = uploadResponse.data.subfolder || "";
      const imagePath = subfolder
        ? `${subfolder}/${uploadedImageName}`
        : uploadedImageName;
      console.log("Image uploaded:", imagePath);

      // --- ワークフロー構築 & プロンプト実行 ---
      const workflow = buildWorkflow(imagePath, params); // 修正された関数を呼び出す
      console.log("Built Workflow:", JSON.stringify(workflow, null, 2));

      const promptResponse = await axios.post(`${apiUrl}/prompt`, {
        prompt: workflow,
      });

      if (!promptResponse.data || !promptResponse.data.prompt_id) {
        console.error("Prompt execution failed:", promptResponse);
        return { status: "error", error: "プロンプトの実行に失敗しました。" };
      }

      const promptId = promptResponse.data.prompt_id;
      console.log("Prompt ID:", promptId);

      // --- 結果待機 & 取得 ---
      const resultImageUrl = await waitForProcessing(apiUrl, promptId, onProgress);
      console.log("Processing finished, Image URL:", resultImageUrl);

      const generationResult: GenerationResult = {
        id: promptId,
        imageUrl: resultImageUrl,
        prompt: params.prompt,
        params: params, // 保存するパラメータも拡張されたもの
        timestamp: Date.now(),
        type: "image",
      };
      return { status: "success", data: generationResult };
    } catch (error) {
      console.error("画像処理に失敗しました", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "画像処理中に不明なエラーが発生しました。";
      // Axiosエラーの場合、詳細情報をログに出力
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", error.response?.data);
      }
      return { status: "error", error: errorMessage };
    }
  },

  async generateVideo(
    imageFile: File,
    prompt: string,
    videoParams: VideoGenerationParams,
    onProgress?: (progress: number | null) => void
  ): Promise<ApiResponse> {
    // (generateVideoの実装は変更なし)
    try {
      const { apiUrl } = useAppStore.getState();
      if (!apiUrl) throw new Error("API URL is not set.");
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("overwrite", "true");

      const uploadResponse = await axios.post(
        `${apiUrl}/upload/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (uploadResponse.status !== 200) {
        return { status: "error", error: "画像のアップロードに失敗しました。" };
      }
      const uploadedImageName = uploadResponse.data.name;
      const imagePath = uploadedImageName;
      console.log("[generateVideo] Image uploaded:", imagePath); // Log uploaded image path

      const workflow = buildVideoWorkflow(imagePath, prompt, videoParams);
      console.log(
        "Generated Video Workflow for API:",
        JSON.stringify(workflow, null, 2)
      ); // Log the generated workflow
      const promptResponse = await axios.post(`${apiUrl}/prompt`, {
        prompt: workflow,
      });
      console.log("[generateVideo] Prompt API response:", promptResponse.data); // Log prompt API response

      if (!promptResponse.data || !promptResponse.data.prompt_id) {
        return {
          status: "error",
          error: "動画生成プロンプトの実行に失敗しました。",
        };
      }
      const promptId = promptResponse.data.prompt_id;
      console.log("[generateVideo] Prompt ID:", promptId); // Log prompt ID
      const result = await waitForVideoProcessing(apiUrl, promptId, onProgress);
      console.log("[generateVideo] waitForVideoProcessing result:", result); // Log result from waiter

      // waitForVideoProcessing から videoUrl を受け取る
      const { videoUrl } = result;

      const generationResult: GenerationResult = {
        id: promptId,
        videoUrl: videoUrl,
        prompt: prompt,
        params: videoParams,
        timestamp: Date.now(),
        type: "video",
      };
      // ストアの addResult を直接呼び出すのではなく、結果オブジェクトを返す
      // useAppStore.getState().addResult(generationResult); // ここでは呼ばない
      return { status: "success", data: generationResult };
    } catch (error) {
      // Log the detailed error
      console.error("[generateVideo] Error during video generation:", error);
      if (axios.isAxiosError(error)) {
        console.error("[generateVideo] Axios error details:", error.response?.data);
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : "動画生成中に不明なエラーが発生しました。";
      return { status: "error", error: errorMessage };
    }
  },
};

// --- Workflow Builders ---

// buildWorkflow を修正
function buildWorkflow(imagePath: string, params: ComfyUIParams): ApiWorkflow {
  const seed =
    params.seed < 0 ? Math.floor(Math.random() * 2147483647) : params.seed;

  // ベースとなるワークフロー定義
  const baseWorkflow: ApiWorkflow = {
    "1": { // CheckpointLoaderSimple
      class_type: "CheckpointLoaderSimple",
      inputs: {
        // 選択されたチェックポイントを使用。未選択の場合はデフォルト値やエラー処理が必要かも
        ckpt_name: params.selectedCheckpoint || "v1-5-pruned-emaonly.safetensors", // デフォルト値を設定
      },
    },
    "2": { // CLIPTextEncode (Positive)
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["1", 1] }, // CheckpointLoaderSimpleからCLIPを取得
    },
    "3": { // CLIPTextEncode (Negative)
      class_type: "CLIPTextEncode",
      inputs: { text: params.negativePrompt, clip: ["1", 1] }, // CheckpointLoaderSimpleからCLIPを取得
    },
    "4": { // LoadImage
      class_type: "LoadImage",
      inputs: { image: imagePath },
    },
    "5": { // VAEEncode
      class_type: "VAEEncode",
      inputs: { pixels: ["4", 0], vae: ["1", 2] }, // CheckpointLoaderSimpleからVAEを取得
    },
    "6": { // KSampler
      class_type: "KSampler",
      inputs: {
        seed: seed,
        steps: params.steps,
        cfg: params.cfg,
        sampler_name: params.sampler,
        scheduler: "normal", // スケジューラは固定またはパラメータ化
        denoise: params.denoiseStrength,
        // model入力はLoRAの有無で変わる
        // positive/negative入力は変更なし
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["5", 0],
      },
    },
    "7": { // VAEDecode
      class_type: "VAEDecode",
      inputs: { samples: ["6", 0], vae: ["1", 2] }, // CheckpointLoaderSimpleからVAEを取得
    },
    // --- Image Resize ノードを追加 (ID: 11) ---
    "11": {
      class_type: "Image Resize", // ImageScale から変更
      inputs: {
        image: ["7", 0], // VAEDecode からの画像
        resize_width: params.width, // パラメータ名を width から変更
        resize_height: params.height, // パラメータ名を height から変更
        mode: "resize", // 値を "absolute" から "resize" に変更
        supersample: "false", // 値を boolean false から string "false" に変更
        rescale_factor: 1.0, // 追加 (必須パラメータ, float)
        resampling: "bicubic", // 追加 (必須パラメータ, bicubic, bilinear, nearest など)
        // interpolation は削除
      },
    },
    // --- SaveImage ノード (ID: 8) の入力を Image Resize に変更 ---
    "8": { // SaveImage
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "img2img_result",
        images: ["11", 0], // ID を 10 から 11 に変更
      },
    },
  };

  // LoRAが選択されている場合の処理
  if (params.selectedLora && params.selectedLora !== "None") {
    // LoraLoaderノードを追加 (ID: 9 とする)
    baseWorkflow["9"] = {
      class_type: "LoraLoader",
      inputs: {
        lora_name: params.selectedLora,
        strength_model: params.loraStrength ?? 0.8, // デフォルト強度
        strength_clip: params.loraStrength ?? 0.8, // デフォルト強度
        model: ["1", 0], // CheckpointLoaderSimpleからのモデル
        clip: ["1", 1], // CheckpointLoaderSimpleからのCLIP
      },
    };
    // KSampler (ID: 6) の model 入力を LoraLoader (ID: 9) の出力に接続
    baseWorkflow["6"].inputs.model = ["9", 0];
    // LoraLoaderからのCLIPもKSamplerに渡す必要があるか確認 (通常は不要だがワークフローによる)
    // 必要であれば、CLIPTextEncode (ID: 2, 3) の clip 入力も ["9", 1] に変更
    // baseWorkflow["2"].inputs.clip = ["9", 1];
    // baseWorkflow["3"].inputs.clip = ["9", 1];
  } else {
    // LoRAがない場合、KSampler (ID: 6) は CheckpointLoaderSimple (ID: 1) から直接モデルを取得
    baseWorkflow["6"].inputs.model = ["1", 0];
  }

  return baseWorkflow;
}


// buildVideoWorkflow は変更なし
function buildVideoWorkflow(
  imagePath: string,
  prompt: string,
  params: VideoGenerationParams
): ApiWorkflow {
  const workflow = JSON.parse(
    JSON.stringify(videoWorkflowTemplate)
  ) as Workflow;
  const promptApiWorkflow: ApiWorkflow = {};

  workflow.nodes.forEach((node) => {
    // Skip MarkdownNote (ID 55)
    if (node.id === 55 || node.type === "MarkdownNote") {
      return;
    }

    const apiNodeInputs: ApiNodeInputs = {};
    const wv = node.widgets_values || []; // Ensure wv is an array or default to empty

    // --- Map widgets_values to named inputs based on node type/ID ---
    switch (node.type) {
      case "CLIPVisionLoader": // ID 18
        apiNodeInputs["clip_name"] = wv[0];
        break;
      case "FramePackFindNearestBucket": // ID 51
        apiNodeInputs["base_resolution"] = wv[0];
        break;
      // case "FramePackTorchCompileSettings": // ID 27 - No inputs modified by UI/template widgets
      //   break;
      case "VAELoader": // ID 12
        apiNodeInputs["vae_name"] = wv[0];
        break;
      // case "DownloadAndLoadFramePackModel": // ID 54 - Assuming this is not used or pre-configured
      //   break;
      case "ImageResize+": // ID 50
        // Widgets: width(linked), height(linked), interpolation, method, condition, multiple_of
        apiNodeInputs["interpolation"] = wv[2];
        apiNodeInputs["method"] = wv[3];
        apiNodeInputs["condition"] = wv[4];
        apiNodeInputs["multiple_of"] = wv[5];
        break;
      // case "GetImageSizeAndCount": // ID 44, 48 - No inputs modified by UI/template widgets
      //   break;
      case "VAEDecodeTiled": // ID 33
        apiNodeInputs["tile_size"] = wv[0];
        apiNodeInputs["overlap"] = wv[1];
        apiNodeInputs["temporal_size"] = wv[2];
        apiNodeInputs["temporal_overlap"] = wv[3];
        break;
      // case "ConditioningZeroOut": // ID 15 - No inputs modified by UI/template widgets
      //   break;
      case "LoadFramePackModel": // ID 52
        apiNodeInputs["model"] = wv[0];
        apiNodeInputs["base_precision"] = wv[1];
        apiNodeInputs["quantization"] = wv[2];
        apiNodeInputs["attention"] = wv[3]; // Assuming 'attention' maps to the 4th widget
        break;
      case "DualCLIPLoader": // ID 13
        apiNodeInputs["clip_name1"] = wv[0];
        apiNodeInputs["clip_name2"] = wv[1];
        apiNodeInputs["type"] = wv[2];
        apiNodeInputs["behavior"] = wv[3]; // Assuming 'behavior' maps to the 4th widget
        break;
      case "FramePackSampler": {
        // ID 39 - Add braces
        apiNodeInputs["steps"] = params.steps; // UI
        apiNodeInputs["use_teacache"] = wv[1];
        apiNodeInputs["motion_strength"] = params.motionStrength; // UI
        apiNodeInputs["guidance_scale"] = wv[3];
        apiNodeInputs["cfg"] = params.cfgScale; // UI
        // teacache_rel_l1_thresh: Clamp value to max 1.0, default to 0.15 if not a number
        const threshValue = typeof wv[5] === "number" ? wv[5] : 0.15;
        apiNodeInputs["teacache_rel_l1_thresh"] = Math.min(1.0, threshValue);
        apiNodeInputs["seed"] =
          params.seed < 0
            ? Math.floor(Math.random() * 2147483647)
            : params.seed; // UI or random
        // shift: Use default float value 0.0 instead of string "increment"
        apiNodeInputs["shift"] = 0.0; // wv[7] is "increment", which is invalid float
        apiNodeInputs["latent_window_size"] = wv[8];
        apiNodeInputs["gpu_memory_preservation"] = wv[9];
        // apiNodeInputs["teacache_batch_size"] = wv[10]; // Assuming this is correct index
        apiNodeInputs["sampler"] = wv[11];
        apiNodeInputs["total_second_length"] = params.total_second_length; // UI
        break;
      } // Add closing brace
      case "CLIPVisionEncode": // ID 17
        apiNodeInputs["crop"] = wv[0];
        break;
      case "VAEEncode": // ID 20 - No inputs modified by UI/template widgets
        break;
      case "VHS_VideoCombine": // ID 23
        // Handle object-based widgets_values
        if (typeof wv === "object" && wv !== null && !Array.isArray(wv)) {
          const widgetValuesObject = wv as Record<string, unknown>;
          apiNodeInputs["frame_rate"] = params.fps; // UI
          apiNodeInputs["loop_count"] = widgetValuesObject["loop_count"];
          apiNodeInputs["filename_prefix"] =
            widgetValuesObject["filename_prefix"];
          apiNodeInputs["format"] = widgetValuesObject["format"];
          apiNodeInputs["pix_fmt"] = widgetValuesObject["pix_fmt"];
          apiNodeInputs["crf"] = widgetValuesObject["crf"];
          apiNodeInputs["save_metadata"] = widgetValuesObject["save_metadata"];
          apiNodeInputs["pingpong"] = widgetValuesObject["pingpong"];
          apiNodeInputs["save_output"] = widgetValuesObject["save_output"];
        } else if (Array.isArray(wv)) {
          // Fallback for array-based (needs verification)
          apiNodeInputs["frame_rate"] = params.fps; // UI
          // Map other array indices if known
          console.warn(
            "VHS_VideoCombine widgets_values is an array. Index mapping needs verification."
          );
        }
        break;
      case "LoadImage": // ID 19
        apiNodeInputs["image"] = imagePath; // UI image path
        break;
      case "CLIPTextEncode": // ID 47
        apiNodeInputs["text"] = prompt; // UI prompt
        // Handle nested array for token_normalization and weight_interpretation if present
        if (Array.isArray(wv[1]) && wv[1].length >= 2) {
          apiNodeInputs["token_normalization"] = wv[1][0];
          apiNodeInputs["weight_interpretation"] = wv[1][1];
        }
        break;
      default:
        // For nodes not explicitly handled, try generic widget mapping based on template inputs
        if (node.inputs && Array.isArray(wv)) {
          node.inputs.forEach((input, index) => {
            // Only map if it's a widget input (no link) and has a name
            if (
              input.link === null &&
              input.widget?.name &&
              wv[index] !== undefined
            ) {
              apiNodeInputs[input.widget.name] = wv[index];
            }
          });
        }
        break;
    }

    // --- Add linked inputs ---
    workflow.links.forEach((link) => {
      if (link[3] === node.id) {
        // link[3] is target_node_id
        const originNodeId = link[1];
        const originSlot = link[2];
        const targetNode = workflow.nodes.find((n) => n.id === node.id);
        const targetSlotIndex = link[4];
        const targetSlotName = targetNode?.inputs?.[targetSlotIndex]?.name;

        if (targetSlotName) {
          // Ensure we don't overwrite widget values mapped above if a link exists for the same input name
          if (
            !Object.prototype.hasOwnProperty.call(apiNodeInputs, targetSlotName)
          ) {
            apiNodeInputs[targetSlotName] = [String(originNodeId), originSlot];
          }
        } else {
          console.warn(
            `Target slot name not found for link target node ${node.id}, slot index ${targetSlotIndex}`
          );
        }
      }
    });

    promptApiWorkflow[String(node.id)] = {
      class_type: node.type,
      inputs: apiNodeInputs,
    };
  });

  return promptApiWorkflow;
}

// --- WebSocket Waiters ---

async function waitForProcessing(
  apiUrl: string,
  promptId: string,
  onProgress?: (progress: number | null) => void
): Promise<string> {
  // Returns image URL
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${apiUrl.replace("http", "ws")}/ws?clientId=${promptId}`
    );
    let timeoutId: number;

    ws.onopen = () => {
      console.log("Image Processing WebSocket connection established");
      timeoutId = window.setTimeout(() => {
        ws.close();
        reject("処理がタイムアウトしました");
      }, 300000); // 5 min
    };

    ws.onmessage = async (event) => {
      // Handle only string data as JSON
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);
        // console.log("Image WS Message:", message); // Optional: Log only parsed messages

        if (message.type === "progress") {
          const progressValue = message.data.value / message.data.max;
          if (onProgress) onProgress(progressValue);
        }

        const isExecutionComplete =
          message.type === "executing" && message.data.node === null;
        const isQueueEmpty =
          message.type === "status" &&
          message.data?.status?.exec_info?.queue_remaining === 0;

        if (isExecutionComplete || isQueueEmpty) {
          clearTimeout(timeoutId);
          if (onProgress) onProgress(null);

          try {
            await new Promise((res) => setTimeout(res, 500)); // Wait for history
            const historyResponse = await axios.get(
              `${apiUrl}/history/${promptId}`
            );
            const historyData = historyResponse.data[promptId];
            const outputs = historyData?.outputs;

            if (outputs) {
              const saveImageNodeId = Object.keys(outputs).find(
                (id) => outputs[id]?.images
              );
              const imageData = saveImageNodeId
                ? outputs[saveImageNodeId]
                : null;

              if (imageData?.images?.[0]) {
                const img = imageData.images[0];
                const imageUrl = `${apiUrl}/view?filename=${encodeURIComponent(
                  img.filename
                )}&type=${img.type || "output"}&subfolder=${
                  img.subfolder || ""
                }`;
                ws.close();
                resolve(imageUrl);
              } else {
                ws.close(); // Close WS before rejecting
                reject(
                  "生成された画像が見つかりませんでした (SaveImage output)"
                );
              }
            } else {
              ws.close(); // Close WS before rejecting
              reject("処理結果が見つかりませんでした (History API)");
            }
          } catch (error) {
            console.error("履歴の取得に失敗しました", error);
            ws.close(); // Ensure WS is closed on error
            reject("履歴の取得に失敗しました");
          }
          // Removed finally block as ws.close() is handled in try/catch/reject paths
        } else if (message.type === "error") {
          // Still inside the 'if (typeof event.data === 'string')' block
          clearTimeout(timeoutId);
          if (onProgress) onProgress(null);
          ws.close();
          reject(
            `エラーが発生しました: ${message.data.message || "Unknown error"}`
          );
        }
        // Close the 'if (typeof event.data === 'string')' block
      } else {
        // Optional: Log if binary data is received
        // console.log("Received binary WebSocket message.");
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error("WebSocketエラー:", error);
      reject("WebSocket接続でエラーが発生しました");
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      console.log("Image Processing WebSocket connection closed");
    };
  });
}

// 戻り値の型を videoUrl のみ含むオブジェクトに変更
async function waitForVideoProcessing(
  apiUrl: string,
  promptId: string,
  onProgress?: (progress: number | null) => void
): Promise<{ videoUrl: string }> { // videoUrl を含むオブジェクトを返すように変更
  return new Promise((resolve, reject) => {
    const wsUrl = `${apiUrl.replace(/^http/, "ws")}/ws?clientId=${promptId}`;
    console.log("Connecting to Video WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    let timeoutId: number;

    ws.onopen = () => {
      console.log("Video Processing WebSocket connection established");
      timeoutId = window.setTimeout(() => {
        console.warn("Video WebSocket connection timed out.");
        ws.close();
        reject("動画処理がタイムアウトしました");
      }, 600000); // 10 minutes for video
    };

    ws.onmessage = async (event) => {
       if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          // console.log("Video WS Message:", message);

          if (message.type === "progress") {
            const progressValue = message.data.value / message.data.max;
            if (onProgress) onProgress(progressValue);
          }

          const isExecutionComplete =
            message.type === "executing" && message.data.node === null;
          const isQueueEmpty =
            message.type === "status" &&
            message.data?.status?.exec_info?.queue_remaining === 0;

          if (isExecutionComplete || isQueueEmpty) {
            console.log("Video processing seems complete, fetching history...");
            clearTimeout(timeoutId);
            if (onProgress) onProgress(null);

            await new Promise((res) => setTimeout(res, 1000)); // Wait longer for video file saving

            try {
              const historyResponse = await axios.get(
                `${apiUrl}/history/${promptId}`
              );
              const historyData = historyResponse.data[promptId];

               if (!historyData || !historyData.outputs) {
                 console.error("Video History data or outputs not found:", historyResponse.data);
                 reject("動画処理結果が見つかりませんでした (History API)");
                 ws.close();
                 return;
              }

              const outputs = historyData.outputs;
              // VHS_VideoCombine ノード (ID: 23) の出力を探す
              const videoOutputNodeId = Object.keys(outputs).find(
                 (id) => outputs[id]?.gifs // 'gifs' プロパティ (実際は動画ファイル情報) を持つノード
              );

              if (!videoOutputNodeId) {
                 console.error("Video output node (VHS_VideoCombine) not found:", outputs);
                 reject("生成された動画を含む出力ノードが見つかりませんでした。");
                 ws.close();
                 return;
              }

              // 出力情報から動画ファイル名を取得
              // VHS_VideoCombine の出力形式に合わせて調整が必要
              const videoData = outputs[videoOutputNodeId].gifs[0]; // 仮に gifs 配列の最初の要素とする

              if (videoData && videoData.filename) {
                const videoUrl = `${apiUrl}/view?filename=${encodeURIComponent(
                  videoData.filename
                )}&type=${videoData.type || "output"}&subfolder=${encodeURIComponent(videoData.subfolder || "")}`; // type と subfolder も考慮
                console.log("Video URL constructed:", videoUrl);
                resolve({ videoUrl }); // オブジェクトでラップして返す
              } else {
                 console.error("Video filename not found in output:", outputs[videoOutputNodeId]);
                 reject("生成された動画ファイル名が見つかりませんでした。");
              }
            } catch (histError) {
              console.error("動画履歴の取得または解析に失敗しました", histError);
              reject("動画履歴の取得または解析に失敗しました。");
            } finally {
              ws.close();
            }
          } else if (message.type === "execution_error") {
             console.error("Video Execution error from WebSocket:", message.data);
             clearTimeout(timeoutId);
             if (onProgress) onProgress(null);
             reject(
               `サーバー側で動画生成エラーが発生しました: ${message.data.exception_message || "Unknown error"}`
             );
             ws.close();
          }
        } catch (parseError) {
           console.error("Failed to parse Video WebSocket message:", parseError, event.data);
        }
       } else {
         console.log("Received non-string Video WebSocket message:", event.data);
       }
    };

    ws.onerror = (error) => {
      console.error("Video WebSocketエラーが発生しました", error);
      clearTimeout(timeoutId);
      if (onProgress) onProgress(null);
      reject("Video WebSocket接続でエラーが発生しました。");
    };

    ws.onclose = (event) => {
      console.log("Video WebSocket connection closed", event.code, event.reason);
      clearTimeout(timeoutId);
      if (!event.wasClean) {
        // reject("Video WebSocket接続が異常終了しました。");
      }
    };
  });
}
