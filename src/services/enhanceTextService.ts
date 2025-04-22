const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// --- Helper function to convert image file to base64 ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- API Request Body Builder ---
const buildRequestBody = async (
  text: string,
  systemPrompt: string,
  imageFile: File | null
): Promise<Record<string, unknown>> => {
  // モデルを gpt-4.1-nano に固定
  const model = "gpt-4.1-nano";
  const messages: { role: string; content: unknown }[] = [
    { role: "system", content: systemPrompt },
  ];

  if (imageFile) {
    // 画像がある場合も gpt-4.1-nano を使用
    // model = "gpt-4-turbo"; // モデル変更ロジックを削除
    console.log("Enhancing text with image context using", model, "...");
    try {
      const base64Image = await fileToBase64(imageFile);
      messages.push({
        role: "user",
        content: [
          { type: "text", text: text },
          {
            type: "image_url",
            image_url: {
              url: base64Image,
              // detail: "low" // 必要に応じて解像度を指定
            },
          },
        ],
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      // 画像処理エラー時はテキストのみでリクエストを試みる
      // モデルは gpt-4.1-nano のまま
      // model = "gpt-4.1-nano"; // フォールバック指定は不要
      messages.push({ role: "user", content: text });
      console.log("Image processing failed, using text-only for model:", model);
    }
  } else {
    console.log("Enhancing text without image context using", model, "...");
    messages.push({ role: "user", content: text });
  }

  return {
    model: model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 300, // Visionモデルはmax_tokensが必要な場合がある
  };
};

/**
 * OpenAI APIを使用して入力テキストを拡張します。画像コンテキストも利用可能です。
 * @param text 拡張するテキスト
 * @param systemPrompt AIへの指示
 * @param imageFile (オプション) コンテキストとして使用する画像ファイル
 * @returns 拡張されたテキスト
 */
export async function enhanceText(
  text: string,
  systemPrompt: string,
  imageFile: File | null = null // imageFile パラメータを追加
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("VITE_OPENAI_API_KEY is not set in environment variables.");
  }

  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const body = await buildRequestBody(text, systemPrompt, imageFile);
    console.log("OpenAI Request Body:", JSON.stringify(body, null, 2)); // リクエストボディをログ出力

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json(); // エラーレスポンスもJSON形式で取得試行
      console.error(
        `OpenAI Enhance API Error (${response.status}):`,
        errorBody
      );
      // エラーメッセージをより詳細に
      const detail = errorBody?.error?.message || response.statusText;
      throw new Error(
        `OpenAI API request failed: ${response.status} ${detail}`
      );
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      console.warn("OpenAI Enhance API returned no content or unexpected format:", data);
      return text; // 失敗時は元のテキストを返す
    }
    console.log("Enhanced text:", enhanced);
    return enhanced;
  } catch (error) {
    console.error("Error during enhanceText:", error);
    // エラーを再スローして呼び出し元で処理できるようにする
    throw error instanceof Error ? error : new Error(String(error));
  }
}
