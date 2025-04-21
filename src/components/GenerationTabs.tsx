import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { useAppStore } from "../store/useAppStore"; // useAppStore をインポート
import GenerationPanel from "./GenerationPanel"; // 画像生成
import VideoGenerationPanel from "./VideoGenerationPanel"; // 動画生成

const GenerationTabs = () => {
  const { activeTab, setActiveTab } = useAppStore(); // activeTab も取得

  const handleTabChange = (key: React.Key) => {
    if (key === "image-tab") {
      setActiveTab("image");
    } else if (key === "video-tab") {
      setActiveTab("video");
    }
  };

  return (
    <Tabs
      className="w-full"
      selectedKey={activeTab === "image" ? "image-tab" : "video-tab"}
      onSelectionChange={handleTabChange}
    >
      <TabList
        aria-label="生成タイプ選択"
        className="flex border-b border-gray-200 dark:border-gray-700 mb-4"
      >
        <Tab
          id="image-tab" // アクセシビリティのためにユニークなID
          className={({ isSelected }) =>
            `px-4 py-2 -mb-px cursor-pointer border-b-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-t-md ${
              isSelected
                ? "border-blue-500 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500"
            }`
          }
        >
          画像生成
        </Tab>
        <Tab
          id="video-tab" // アクセシビリティのためにユニークなID
          className={({ isSelected }) =>
            `px-4 py-2 -mb-px cursor-pointer border-b-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded-t-md ${
              isSelected
                ? "border-blue-500 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500"
            }`
          }
        >
          動画生成
        </Tab>
      </TabList>
      <TabPanel
        id="image-tab"
        className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
      >
        <GenerationPanel />
      </TabPanel>
      <TabPanel
        id="video-tab"
        className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
      >
        <VideoGenerationPanel />
      </TabPanel>
    </Tabs>
  );
};

export default GenerationTabs;
