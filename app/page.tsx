"use client";

import React, { useState, useEffect } from "react";
import { useSettings } from "../hooks/useSettings";
import { useOllama } from "../hooks/useOllama";
import { useChat } from "../hooks/useChat";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import Modal from "../components/ui/Modal";
import SettingsPanel from "../components/SettingsPanel";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function Home() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const {
    models,
    isLoadingModels,
    connectionStatus,
    errorMsg,
    testConnection,
    fetchModels,
    chatStream,
  } = useOllama();

  const {
    chats,
    activeChat,
    activeChatId,
    isGenerating,
    createNewChat,
    selectChat,
    deleteChat,
    renameChat,
    clearAllChats,
    sendMessage,
    regenerateLastMessage,
  } = useChat();

  const [selectedModel, setSelectedModel] = useLocalStorage<string>("ilsa-selected-model", "");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync Ollama connection and fetch models on load and URL change
  useEffect(() => {
    if (settings.ollamaUrl) {
      fetchModels(settings.ollamaUrl);
    }
  }, [settings.ollamaUrl, fetchModels]);

  // Set default model once models are fetched
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // Find a default model or take the first one
      setSelectedModel(models[0].name);
    } else if (models.length > 0 && selectedModel) {
      // Check if current selected model still exists, if not, pick the first
      const exists = models.some((m) => m.name === selectedModel);
      if (!exists) {
        setSelectedModel(models[0].name);
      }
    }
  }, [models, selectedModel, setSelectedModel]);

  const handleSendMessage = (content: string) => {
    sendMessage(
      content,
      settings.ollamaUrl,
      selectedModel,
      settings.systemPrompt,
      settings.temperature,
      chatStream
    );
  };

  const handleRegenerate = () => {
    regenerateLastMessage(
      settings.ollamaUrl,
      settings.systemPrompt,
      settings.temperature,
      chatStream
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar - responsive layout */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        onCreateNewChat={() => createNewChat(selectedModel)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        connectionStatus={connectionStatus}
        activeModel={selectedModel}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main chat UI area */}
      <ChatWindow
        activeChat={activeChat}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onSendMessage={handleSendMessage}
        isGenerating={isGenerating}
        onRegenerate={handleRegenerate}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        connectionStatus={connectionStatus}
      />

      {/* Settings Modal Dialog */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Settings & Configuration"
      >
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          onReset={resetSettings}
          onClearChats={clearAllChats}
          onTestConnection={testConnection}
          connectionStatus={connectionStatus}
        />
      </Modal>
    </div>
  );
}
