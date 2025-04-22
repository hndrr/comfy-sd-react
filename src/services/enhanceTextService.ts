const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- Text Enhance API 設定 (OpenAI) ---
const ENHANCE_API_CONFIG = {
  url: "https://api.openai.com/v1/chat/completions",
  getHeaders: () => {
    if (!OPENAI_API_KEY) throw new Error("VITE_OPENAI_API_KEY is not set");
    return {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    };
  },
  getBody: (text: string, systemPrompt: string) => ({
    // systemPrompt を引数に追加
    model: "gpt-4.1-nano",
    messages: [
      {
        role: "system",
        content: systemPrompt, // 引数で受け取ったsystemPromptを使用
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.7,
  }),
} as const;

/**
 * OpenAI APIを使用して入力テキストを拡張します。
 * @param text 拡張するテキスト
 * @returns 拡張されたテキスト
 */
export async function enhanceText(
  text: string,
  systemPrompt: string
): Promise<string> {
  console.log("Enhancing text with OpenAI...");
  const config = ENHANCE_API_CONFIG;
  const headers = config.getHeaders();
  const body = JSON.stringify(config.getBody(text, systemPrompt)); // getBody に systemPrompt を渡す

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `OpenAI Enhance API Error (${response.status}):`,
        errorBody
      );
      throw new Error(
        `OpenAI Enhance API request failed with status ${response.status}`
      );
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      console.warn("OpenAI Enhance API returned no content.");
      return text; // 失敗時は元のテキストを返す
    }
    console.log("Enhanced text:", enhanced);
    return enhanced;
  } catch (error) {
    console.error("Error during enhanceText:", error);
    throw error;
  }
}
