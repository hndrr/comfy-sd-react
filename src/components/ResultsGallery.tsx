import React from 'react';
import { Download, Trash2, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { downloadImage } from '../utils/imageHelpers';

const ResultItem: React.FC<{ 
  id: string;
  imageUrl: string; 
  timestamp: number;
  onDelete: (id: string) => void;
}> = ({ id, imageUrl, timestamp, onDelete }) => {
  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  
  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      <img 
        src={imageUrl} 
        alt={`生成結果 ${formattedDate}`} 
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      
      <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity">
        <div className="text-xs text-white self-end">
          {formattedDate}
        </div>
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-full bg-red-600/80 text-white hover:bg-red-700 transition-colors"
            aria-label="この結果を削除"
          >
            <Trash2 size={16} />
          </button>
          
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => window.open(imageUrl, '_blank')}
              className="p-1.5 rounded-full bg-gray-700/80 text-white hover:bg-gray-800 transition-colors"
              aria-label="新しいタブで開く"
            >
              <ArrowUpRight size={16} />
            </button>
            
            <button
              type="button"
              onClick={() => downloadImage(imageUrl, `comfyui-gen-${Date.now()}.png`)}
              className="p-1.5 rounded-full bg-blue-600/80 text-white hover:bg-blue-700 transition-colors"
              aria-label="画像をダウンロード"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultsGallery: React.FC = () => {
  const { results, removeResult } = useAppStore();
  
  if (results.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full mt-8">
      <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
        生成結果
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((result) => (
          <ResultItem
            key={result.id}
            id={result.id}
            imageUrl={result.imageUrl}
            timestamp={result.timestamp}
            onDelete={removeResult}
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;