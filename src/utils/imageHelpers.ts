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
 * 画像をダウンロード
 */
export const downloadImage = (
  url: string, 
  filename: string = 'comfyui-generated.png'
) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * ランダムなシード値を生成
 */
export const generateRandomSeed = (): number => {
  return Math.floor(Math.random() * 2147483647);
};