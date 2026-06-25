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
import { useNotification } from "../hooks/useNotification";
import { useAutonomousChat } from "../hooks/useAutonomousChat";

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
    addAssistantMessage,
  } = useChat();

  const { showNotification } = useNotification();

  const [selectedModel, setSelectedModel] = useLocalStorage<string>("ilsa-selected-model", "");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Run the autonomous background messaging simulation
  const autonomousChatDebug = useAutonomousChat({
    activeChat,
    selectedModel,
    settings,
    isGenerating,
    addAssistantMessage,
    showNotification,
  });

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

  const [memories, setMemories] = useState<string[]>([]);
  const [wasGenerating, setWasGenerating] = useState(false);

  // Fetch memories helper
  const fetchMemories = async () => {
    try {
      const res = await fetch("/api/kv?key=assistant-memory");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.value)) {
          setMemories(data.value);
        } else {
          setMemories([]);
        }
      }
    } catch (err) {
      console.error("Error fetching memories in page:", err);
    }
  };

  useEffect(() => {
    if (settings.enableMemory) {
      fetchMemories();
    } else {
      setMemories([]);
    }
  }, [settings.enableMemory]);

  // Sync memory when manual updates happen via command
  useEffect(() => {
    const handleUpdate = () => {
      fetchMemories();
    };
    window.addEventListener("memories-updated", handleUpdate);
    return () => {
      window.removeEventListener("memories-updated", handleUpdate);
    };
  }, []);

  const extractMemoriesInBackground = async (chatMessages: any[], currentMemories: string[]) => {
    if (!settings.enableMemory || chatMessages.length < 2) return;
    
    // Take last 4 messages to avoid sending too much context
    const recentMessages = chatMessages.slice(-4);
    const conversationStr = recentMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const extractionPrompt = `Analyze the following conversation and extract any new core facts, preferences, or details about the user that are worth remembering for future sessions (e.g. user's name, coding preferences, tech stack, job, interests).
Do not extract transient details (like a specific bug they are debuging right now, or a greeting).
Return ONLY the new facts as a JSON array of strings, e.g. ["User prefers TypeScript", "User's name is John"]. If no new details are found, return an empty array [].
Existing memories to avoid duplicating:
${currentMemories.map(m => `- ${m}`).join("\n")}

Output ONLY valid JSON array of strings. Do not include markdown code block syntax.

Conversation:
${conversationStr}`;

    try {
      const response = await fetch("/api/ollama", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ollama-url": settings.ollamaUrl,
          "x-ollama-endpoint": "api/chat",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: "You are a JSON fact-extractor. Output ONLY a valid JSON array of strings, or an empty array []." },
            { role: "user", content: extractionPrompt }
          ],
          stream: false,
          options: {
            temperature: 0.1,
            num_ctx: settings.contextLimit,
          },
          keep_alive: settings.keepAlive === "-1" ? -1 : settings.keepAlive,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const content = data?.message?.content?.trim();
      if (!content) return;
      
      const jsonStr = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const newFacts = JSON.parse(jsonStr);
      if (Array.isArray(newFacts) && newFacts.length > 0) {
        const filteredNewFacts = newFacts.filter(f => typeof f === "string" && f.trim() && !currentMemories.includes(f.trim()));
        if (filteredNewFacts.length > 0) {
          const updated = [...currentMemories, ...filteredNewFacts];
          await fetch("/api/kv", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "assistant-memory", value: updated }),
          });
          setMemories(updated);
        }
      }
    } catch (e) {
      console.warn("Background memory extraction failed:", e);
    }
  };

  useEffect(() => {
    if (wasGenerating && !isGenerating && activeChat) {
      extractMemoriesInBackground(activeChat.messages, memories);
    }
    setWasGenerating(isGenerating);
  }, [isGenerating, activeChat, memories, wasGenerating]);

  const getSystemPromptWithMemories = () => {
    let basePrompt = settings.systemPrompt;
    if (settings.enableMemory && memories.length > 0) {
      basePrompt += `\n\nAssistant Memories of User (Remember these details about the user):\n${memories.map(m => `- ${m}`).join("\n")}`;
    }
    return basePrompt;
  };

  const handleSendMessage = (content: string) => {
    sendMessage(
      content,
      settings.ollamaUrl,
      selectedModel,
      getSystemPromptWithMemories(),
      settings.temperature,
      settings.contextLimit,
      settings.keepAlive,
      chatStream
    );
  };

  const handleRegenerate = () => {
    regenerateLastMessage(
      settings.ollamaUrl,
      getSystemPromptWithMemories(),
      settings.temperature,
      settings.contextLimit,
      settings.keepAlive,
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
        settings={settings}
        onUpdateSetting={updateSetting}
        autonomousChatDebug={autonomousChatDebug}
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
