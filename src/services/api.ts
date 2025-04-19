import axios from "axios";
import { ComfyUIParams, ApiResponse } from "../types";
import { useAppStore } from "../store/useAppStore";

// モジュールスコープでの setProgress 取得を削除

// ComfyUIのAPIと通信するサービス
export const comfyUIApi = {
  // ステータスを確認する
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

  // 画像をアップロードしてImage-to-Imageを実行する
  async processImage(
    imageFile: File,
    params: ComfyUIParams
  ): Promise<ApiResponse> {
    try {
      const { apiUrl } = useAppStore.getState();

      // 画像のアップロード
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("overwrite", "true");

      const uploadResponse = await axios.post(
        `${apiUrl}/upload/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (uploadResponse.status !== 200) {
        return {
          status: "error",
          error: "画像のアップロードに失敗しました。",
        };
      }

      const uploadedImageName = uploadResponse.data.name;
      const uploadedImageFolder = uploadResponse.data.folder || "";
      const imagePath = uploadedImageFolder
        ? `${uploadedImageFolder}/${uploadedImageName}`
        : uploadedImageName;

      // ワークフローの作成
      const workflow = buildWorkflow(imagePath, params);

      // プロンプトの実行
      const promptResponse = await axios.post(`${apiUrl}/prompt`, {
        prompt: workflow,
      });

      if (!promptResponse.data || !promptResponse.data.prompt_id) {
        return {
          status: "error",
          error: "プロンプトの実行に失敗しました。",
        };
      }

      const promptId = promptResponse.data.prompt_id;

      // 処理の完了を待機
      const result = await waitForProcessing(apiUrl, promptId);

      return { status: "success", data: result };
    } catch (error) {
      console.error("画像処理に失敗しました", error);
      return {
        status: "error",
        error: "画像処理中にエラーが発生しました。",
      };
    }
  },
};

// ComfyUIのImage-to-Imageワークフローを構築する関数
function buildWorkflow(imagePath: string, params: ComfyUIParams): object {
  // 実際のComfyUIワークフロー
  // これは標準的なSD 1.5モデルを使用するImage-to-Imageワークフローの例です
  const seed =
    params.seed < 0 ? Math.floor(Math.random() * 2147483647) : params.seed;

  return {
    "1": {
      inputs: {
        ckpt_name: "v1-5-pruned-emaonly-fp16.safetensors", // ユーザーの環境に合わせたモデル名
      },
      class_type: "CheckpointLoaderSimple",
    },
    "2": {
      inputs: {
        text: params.prompt,
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "3": {
      inputs: {
        text: params.negativePrompt,
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "4": {
      inputs: {
        image: imagePath,
        "choose file to upload": "image",
      },
      class_type: "LoadImage",
    },
    "5": {
      inputs: {
        pixels: ["4", 0],
        vae: ["1", 2],
      },
      class_type: "VAEEncode",
    },
    "6": {
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
      class_type: "KSampler",
    },
    "7": {
      inputs: {
        samples: ["6", 0],
        vae: ["1", 2],
      },
      class_type: "VAEDecode",
    },
    "8": {
      inputs: {
        filename_prefix: "img2img_result",
        images: ["7", 0],
      },
      class_type: "SaveImage",
    },
  };
}

// 処理の完了を待機する関数
async function waitForProcessing(
  apiUrl: string,
  promptId: string
): Promise<string> {
  // 関数内で最新の setProgress を取得
  const { setProgress } = useAppStore.getState();

  return new Promise((resolve, reject) => {
    // WebSocketを使用してリアルタイムに進捗を監視
    const ws = new WebSocket(
      `${apiUrl.replace("http", "ws")}/ws?clientId=${promptId}`
    );
    let timeoutId: number;
    // progressCompleted フラグは不要なので削除

    ws.onopen = () => {
      console.log("WebSocket接続が確立されました");
      // タイムアウトを設定
      timeoutId = window.setTimeout(() => {
        ws.close();
        reject("処理がタイムアウトしました");
      }, 300000); // 5分
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("WebSocket Message Received:", message); // 受信メッセージをログ出力

      // 進捗メッセージの場合、状態を更新
      if (message.type === "progress") {
        const progressValue = message.data.value / message.data.max;
        setProgress(progressValue); // 0-1 の値で進捗を更新
      }

      // 完了判定ロジック
      const isExecutionComplete =
        message.type === "executing" && message.data.node === null;
      // 進捗完了後にキューが空になった場合も完了とみなす
      // isQueueEmptyAfterProgress の判定から progressCompleted を削除
      // (progress が 1 になったかどうかは setProgress 内で判定されるため不要)
      const isQueueEmptyAfterProgress =
        message.type === "status" &&
        message.data?.status?.exec_info?.queue_remaining === 0;

      if (isExecutionComplete || isQueueEmptyAfterProgress) {
        clearTimeout(timeoutId);
        // progressCompleted のリセットは不要

        try {
          // 完了時に進捗を null にリセット
          setProgress(null);
          // 履歴取得前に少し待機（サーバー側での準備時間を考慮）
          await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5秒待機

          // 履歴から生成された画像を取得
          const historyResponse = await axios.get(
            `${apiUrl}/history/${promptId}`
          );
          console.log("History API Response:", historyResponse.data); // 履歴APIのレスポンスをログ出力
          // 正しい方法で outputs を取得 (レスポンスのキーは promptId)
          const historyData = historyResponse.data[promptId];
          const outputs = historyData ? historyData.outputs : null;

          if (outputs && Object.keys(outputs).length > 0) {
            // 最後のノード（SaveImage）の出力を取得
            const lastNodeId = Object.keys(outputs).pop();
            // lastNodeIdが存在するかチェックを追加
            if (lastNodeId) {
              const imageData = outputs[lastNodeId];

              if (
                imageData &&
                imageData.images &&
                imageData.images.length > 0
              ) {
                const imageName = imageData.images[0].filename;
                const imageUrl = `${apiUrl}/view?filename=${imageName}`;

                ws.close();
                resolve(imageUrl);
              } else {
                ws.close();
                reject("生成された画像が見つかりませんでした");
              }
            } else {
              // lastNodeId が undefined の場合
              ws.close();
              reject("最後のノードIDが見つかりませんでした");
            }
          } else {
            // outputs が空の場合
            ws.close();
            reject("処理結果が見つかりませんでした");
          }
        } catch (error) {
          console.error("履歴の取得に失敗しました", error);
          ws.close();
          reject("履歴の取得に失敗しました");
        }
      }

      // エラーイベント (エラー発生時にも進捗をリセット)
      if (message.type === "error") {
        clearTimeout(timeoutId);
        setProgress(null); // 進捗をリセット
        ws.close();
        reject(
          `エラーが発生しました: ${message.data.message || "Unknown error"}`
        );
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error("WebSocketエラー:", error);
      reject("WebSocket接続でエラーが発生しました");
    };

    ws.onclose = () => {
      clearTimeout(timeoutId);
      console.log("WebSocket接続が閉じられました");
    };
  });
}
