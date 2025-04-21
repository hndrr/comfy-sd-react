import axios from "axios";
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings";
import { useAppStore } from "../store/useAppStore";
import { ApiResponse, ComfyUIParams, GenerationResult } from "../types";
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

// --- API Service ---
export const comfyUIApi = {
  async checkStatus(): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();
      const response = await axios.get(`${apiUrl}/system_stats`);
      return { status: "success", data: response.data };
    } catch (error) {
      console.error("APIステータスの確認に失敗しました", error);
      return {
        status: "error",
        error: "接続に失敗しました。APIのURLを確認してください。",
      };
    }
  },

  async processImage(
    imageFile: File,
    params: ComfyUIParams,
    onProgress?: (progress: number | null) => void
  ): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();
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
      const uploadedImageFolder = uploadResponse.data.folder || "";
      const imagePath = uploadedImageFolder
        ? `${uploadedImageFolder}/${uploadedImageName}`
        : uploadedImageName;

      const workflow = buildWorkflow(imagePath, params);
      const promptResponse = await axios.post(`${apiUrl}/prompt`, {
        prompt: workflow,
      });

      if (!promptResponse.data || !promptResponse.data.prompt_id) {
        return { status: "error", error: "プロンプトの実行に失敗しました。" };
      }

      const promptId = promptResponse.data.prompt_id;
      const result = await waitForProcessing(apiUrl, promptId, onProgress);

      const generationResult: GenerationResult = {
        id: promptId,
        imageUrl: result,
        prompt: params.prompt,
        params: params,
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
      return { status: "error", error: errorMessage };
    }
  },

  async generateVideo(
    imageFile: File,
    prompt: string,
    videoParams: VideoGenerationParams,
    onProgress?: (progress: number | null) => void
  ): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();
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

function buildWorkflow(imagePath: string, params: ComfyUIParams): object {
  const seed =
    params.seed < 0 ? Math.floor(Math.random() * 2147483647) : params.seed;
  // Simplified standard image-to-image workflow for brevity
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "v1-5-pruned-emaonly-fp16.safetensors" },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.negativePrompt, clip: ["1", 1] },
    },
    "4": { class_type: "LoadImage", inputs: { image: imagePath } },
    "5": {
      class_type: "VAEEncode",
      inputs: { pixels: ["4", 0], vae: ["1", 2] },
    },
    "6": {
      class_type: "KSampler",
      inputs: {
        seed: seed,
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
      class_type: "VAEDecode",
      inputs: { samples: ["6", 0], vae: ["1", 2] },
    },
    "8": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "img2img_result", images: ["7", 0] },
    },
  };
}

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
): Promise<{ videoUrl: string }> {
  // Returns video URL
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${apiUrl.replace("http", "ws")}/ws?clientId=${promptId}`
    );
    let timeoutId: number;

    ws.onopen = () => {
      console.log("Video Processing WebSocket connection established");
      timeoutId = window.setTimeout(() => {
        ws.close();
        reject("動画生成処理がタイムアウトしました");
      }, 600000); // 10 min
    };

    ws.onmessage = async (event) => {
      try { // Add try-catch around message handling
        // Handle only string data as JSON
        if (typeof event.data === "string") {
          const message = JSON.parse(event.data);
          console.log("[waitForVideoProcessing] WS Message:", message); // Log all messages

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
            await new Promise((res) => setTimeout(res, 1000)); // Wait longer for video history
            const historyResponse = await axios.get(
              `${apiUrl}/history/${promptId}`
            );
            console.log("[waitForVideoProcessing] History API response:", historyResponse.data); // Log history API response
            const historyData = historyResponse.data[promptId];
            const outputs = historyData?.outputs;
            console.log("[waitForVideoProcessing] History outputs:", outputs); // Log extracted outputs

            if (outputs) {
              // --- 動画URLの取得 ---
              const videoCombineNodeId = "23"; // VHS_VideoCombine node ID
              const videoData = outputs[videoCombineNodeId];
              console.log(`[waitForVideoProcessing] Output for node ${videoCombineNodeId}:`, videoData); // Log video node output

              // Check for both 'videos' and 'gifs' arrays
              const outputArray = videoData?.videos || videoData?.gifs;

              if (outputArray?.[0]) {
                const videoInfo = outputArray[0];
                // Ensure type is provided, default to 'output' if missing
                const type = videoInfo.type || "output";
                const videoUrl = `${apiUrl}/view?filename=${encodeURIComponent(
                  videoInfo.filename
                )}&type=${type}&subfolder=${videoInfo.subfolder || ""}`;
                ws.close();
                // videoUrl のみ含むオブジェクトで resolve する
                resolve({ videoUrl });
              } else {
                console.error("[waitForVideoProcessing] Video data (videos/gifs array) not found in VHS_VideoCombine output:", videoData); // Log error finding video data
                ws.close(); // Close WS before rejecting
                reject(
                  "生成された動画が見つかりませんでした (VHS_VideoCombine output: videos/gifs array not found or empty)"
                );
              }
            } else {
              ws.close(); // Close WS before rejecting
              reject("動画処理結果が見つかりませんでした (History API outputs missing)");
            }
          } catch (error) {
            console.error("[waitForVideoProcessing] Error fetching or parsing history:", error); // Log history fetch/parse error
            ws.close(); // Ensure WS is closed on error
            reject("動画履歴の取得または解析に失敗しました");
          }
          // Removed finally block as ws.close() is handled in try/catch/reject paths
        } else if (message.type === "error") {
          // Still inside the 'if (typeof event.data === 'string')' block
          clearTimeout(timeoutId);
          if (onProgress) onProgress(null);
          ws.close();
          const errorMsg = message.data.message || "Unknown error";
          console.error("[waitForVideoProcessing] WebSocket error message:", message.data); // Log WS error details
          reject(`動画生成エラー: ${errorMsg}`);
        }
      } else {
        // Optional: Log if binary data is received
        // console.log("[waitForVideoProcessing] Received binary WebSocket message.");
      }
    } catch (parseError) { // Catch JSON parsing errors or other errors in message handler
        console.error("[waitForVideoProcessing] Error handling WebSocket message:", parseError, "Raw data:", event.data);
        // Optionally reject or just log, depending on desired behavior
        // reject("WebSocketメッセージの処理中にエラーが発生しました");
    }
    };

    ws.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error("Video WebSocket error:", error);
      reject("動画生成WebSocket接続でエラーが発生しました");
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      console.log("Video Processing WebSocket connection closed");
    };
  });
}
