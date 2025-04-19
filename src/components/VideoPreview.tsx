import React from "react";

interface VideoPreviewProps {
  videoUrl: string;
  fileName?: string; // Optional filename for download
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  fileName = "generated_video.mp4", // Default filename
}) => {
  return (
    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-800/50">
      {" "}
      {/* 背景色、ボーダー色追加 */}
      <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
        Generated Video
      </h3>{" "}
      {/* 文字色追加 */}
      <div className="aspect-w-16 aspect-h-9 bg-black rounded">
        {" "}
        {/* 背景色追加 */}
        <video
          controls
          src={videoUrl}
          className="w-full h-full object-contain rounded" // Use object-contain to fit video within bounds
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="mt-3 text-center">
        <a
          href={videoUrl}
          download={fileName}
          target="_blank" // Open in new tab for safety, especially for blob URLs
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800" // ダークモードスタイル追加
        >
          Download Video
        </a>
      </div>
    </div>
  );
};

export default VideoPreview;
