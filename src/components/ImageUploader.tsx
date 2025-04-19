import React, { useCallback, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { createPreviewFromFile } from '../utils/imageHelpers';

const ImageUploader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sourceImage, setSourceImage } = useAppStore();
  
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      try {
        const preview = await createPreviewFromFile(file);
        setSourceImage({ file, preview });
      } catch (error) {
        console.error('画像のプレビュー作成に失敗しました', error);
      }
    },
    [setSourceImage]
  );
  
  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      
      try {
        const preview = await createPreviewFromFile(file);
        setSourceImage({ file, preview });
      } catch (error) {
        console.error('画像のプレビュー作成に失敗しました', error);
      }
    },
    [setSourceImage]
  );
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);
  
  const handleClear = useCallback(() => {
    setSourceImage({ file: null, preview: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setSourceImage]);
  
  return (
    <div className="w-full">
      <h2 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
        ソース画像
      </h2>
      
      {!sourceImage.preview ? (
        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            画像をドラッグ＆ドロップ、または
            <span className="text-blue-600 dark:text-blue-400 font-medium"> クリックして選択</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            PNG, JPG, WEBP (最大10MB)
          </p>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden">
          <img 
            src={sourceImage.preview} 
            alt="アップロードされた画像" 
            className="w-full h-auto object-contain rounded-lg"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-gray-900/70 rounded-full text-white hover:bg-gray-900 transition-colors"
            aria-label="画像を削除"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;