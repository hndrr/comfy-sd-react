import React from 'react';
import { XCircle, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const ErrorAlert: React.FC = () => {
  const { error, setError } = useAppStore();
  
  if (!error) return null;
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start text-red-800 dark:text-red-300 shadow-lg">
        <XCircle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          {error}
        </div>
        <button
          type="button"
          onClick={() => setError(null)}
          className="ml-3 flex-shrink-0 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          aria-label="エラーメッセージを閉じる"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ErrorAlert;