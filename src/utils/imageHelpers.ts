/**
 * ファイルからプレビューURLを作成
 */
export const createPreviewFromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject('ファイルの読み込みに失敗しました');
    };
    reader.readAsDataURL(file);
  });
};

/**
 * データURLを生成
 */
export const dataURLtoFile = (
  dataUrl: string, 
  filename: string
): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

/**
 * 画像をダウンロード (async/await を使用)
 */
export const downloadImage = async (
  url: string,
  filename: string = "comfyui-generated.png"
) => {
  try {
    // CORSの問題を回避するため、可能であれば fetch して Blob URL を使う
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl); // Blob URL を解放
  } catch (error) {
    console.error("Error downloading image:", error);
    // fetch に失敗した場合 (CORSなど) は、直接リンクを試すフォールバック
    console.warn("Falling back to direct link download due to fetch error.");
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      // target="_blank" を追加して、ブラウザが直接表示しようとするのを防ぐ場合がある
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (fallbackError) {
      console.error("Fallback direct link download failed:", fallbackError);
      alert("画像のダウンロードに失敗しました。");
    }
  }
};

/**
 * 動画をダウンロード
 */
export const downloadVideo = async (
  url: string,
  filename: string = "comfyui-generated.mp4"
) => {
  try {
    // 画像と同様に fetch して Blob URL を使う
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading video:", error);
    // フォールバック
    console.warn("Falling back to direct link download due to fetch error.");
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (fallbackError) {
      console.error("Fallback direct link download failed:", fallbackError);
      alert("動画のダウンロードに失敗しました。");
    }
  }
};

/**
 * ランダムなシード値を生成
 */
export const generateRandomSeed = (): number => {
  return Math.floor(Math.random() * 2147483647);
};