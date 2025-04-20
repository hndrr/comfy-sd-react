import axios from "axios";
import { ComfyUIParams } from "../types"; // Assuming ComfyUIParams is needed by buildWorkflow
import { GenerationParams as VideoGenerationParams } from "../components/ParameterSettings"; // Assuming VideoGenerationParams is needed by buildVideoWorkflow
import videoWorkflowTemplate from "./videoWorkflowTemplate.json"; // Assuming videoWorkflowTemplate is needed by buildVideoWorkflow

// --- Helper Type Definitions (Copied from api.ts) ---
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

// --- Workflow Builders (Copied from api.ts) ---

export function buildWorkflow(
  imagePath: string,
  params: ComfyUIParams
): object {
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

export function buildVideoWorkflow(
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

// --- WebSocket Waiters (Copied from api.ts) ---

export async function waitForProcessing(
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
      console.log("Image Processing WebSocket connection established (Legacy)");
      timeoutId = window.setTimeout(() => {
        ws.close();
        reject("処理がタイムアウトしました (Legacy)");
      }, 300000); // 5 min
    };

    ws.onmessage = async (event) => {
      // Handle only string data as JSON
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);
        // console.log("Image WS Message (Legacy):", message);

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
                ws.close();
                reject(
                  "生成された画像が見つかりませんでした (SaveImage output) (Legacy)"
                );
              }
            } else {
              ws.close();
              reject("処理結果が見つかりませんでした (History API) (Legacy)");
            }
          } catch (error) {
            console.error("履歴の取得に失敗しました (Legacy)", error);
            ws.close();
            reject("履歴の取得に失敗しました (Legacy)");
          }
        } else if (message.type === "error") {
          clearTimeout(timeoutId);
          if (onProgress) onProgress(null);
          ws.close();
          reject(
            `エラーが発生しました: ${
              message.data.message || "Unknown error"
            } (Legacy)`
          );
        }
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error("WebSocketエラー (Legacy):", error);
      reject("WebSocket接続でエラーが発生しました (Legacy)");
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      console.log("Image Processing WebSocket connection closed (Legacy)");
    };
  });
}

export async function waitForVideoProcessing(
  apiUrl: string,
  promptId: string,
  onProgress?: (progress: number | null) => void
): Promise<string> {
  // Returns video URL (or relevant data)
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${apiUrl.replace("http", "ws")}/ws?clientId=${promptId}`
    );
    let timeoutId: number;

    ws.onopen = () => {
      console.log("Video Processing WebSocket connection established (Legacy)");
      timeoutId = window.setTimeout(() => {
        ws.close();
        reject("動画処理がタイムアウトしました (Legacy)");
      }, 600000); // 10 min timeout for video
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const message = JSON.parse(event.data);
        // console.log("Video WS Message (Legacy):", message);

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
            await new Promise((res) => setTimeout(res, 1000)); // Wait longer for video history?
            const historyResponse = await axios.get(
              `${apiUrl}/history/${promptId}`
            );
            const historyData = historyResponse.data[promptId];
            const outputs = historyData?.outputs;

            if (outputs) {
              // Find the output node for the video (e.g., VHS_VideoCombine ID 23)
              const videoCombineNodeId = Object.keys(outputs).find(
                (id) => outputs[id]?.gifs // Assuming VHS_VideoCombine outputs 'gifs' array
              );
              const videoData = videoCombineNodeId
                ? outputs[videoCombineNodeId]
                : null;

              if (videoData?.gifs?.[0]) {
                const vid = videoData.gifs[0]; // Use the first element in 'gifs'
                // Construct URL based on the video file info
                const videoUrl = `${apiUrl}/view?filename=${encodeURIComponent(
                  vid.filename
                )}&type=${vid.type || "output"}&subfolder=${
                  vid.subfolder || ""
                }`;
                ws.close();
                resolve(videoUrl);
              } else {
                ws.close();
                reject(
                  "生成された動画が見つかりませんでした (VHS_VideoCombine output) (Legacy)"
                );
              }
            } else {
              ws.close();
              reject(
                "動画処理結果が見つかりませんでした (History API) (Legacy)"
              );
            }
          } catch (error) {
            console.error("動画履歴の取得に失敗しました (Legacy)", error);
            ws.close();
            reject("動画履歴の取得に失敗しました (Legacy)");
          }
        } else if (message.type === "error") {
          clearTimeout(timeoutId);
          if (onProgress) onProgress(null);
          ws.close();
          reject(
            `動画生成エラーが発生しました: ${
              message.data.message || "Unknown error"
            } (Legacy)`
          );
        }
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error("Video WebSocketエラー (Legacy):", error);
      reject("Video WebSocket接続でエラーが発生しました (Legacy)");
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      console.log("Video Processing WebSocket connection closed (Legacy)");
    };
  });
}
