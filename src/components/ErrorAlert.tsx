import React from "react";
import { XCircle, X } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

interface ErrorAlertProps {
  message?: string | null; // Optional message prop
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => {
  const { error: globalError, setError: setGlobalError } = useAppStore();

  // Use provided message if available, otherwise use global error state
  const displayError = message !== undefined ? message : globalError;
  // Unused clearError variable removed

  // If message is explicitly null or undefined, and globalError is also null, don't render
  if (displayError === null || displayError === undefined) return null;

  // Determine the appropriate clear function based on whether a message prop was passed
  const handleClearClick = () => {
    if (message !== undefined) {
      // If a message prop is used, the parent component is responsible for clearing it.
      // We might want to add an optional onClear prop later if needed.
      // For now, clicking the 'X' when a message prop is used does nothing to the state here.
      // Alternatively, we could always clear the global state, but that might be confusing.
      // Let's assume the parent handles clearing its own state if it passes a message.
      // If no message prop, clear the global error.
      setGlobalError(null); // Let's clear global error anyway for simplicity for now.
      // Consider adding an onClear prop for better control.
    } else {
      setGlobalError(null);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start text-red-800 dark:text-red-300 shadow-lg">
        <XCircle size={20} className="mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">{displayError}</div>
        <button
          type="button"
          onClick={handleClearClick} // Use the determined clear function
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
