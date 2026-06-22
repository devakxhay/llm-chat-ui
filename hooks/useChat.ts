"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useState, useCallback, useMemo } from "react";
import { ChatMessagePayload } from "./useOllama";

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
}

export function useChat() {
  const [chats, setChats] = useLocalStorage<ChatSession[]>("ilsa-chats", []);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>("ilsa-active-chat-id", null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId);
  }, [chats, activeChatId]);

  const createNewChat = useCallback((model: string) => {
    const newChat: ChatSession = {
      id: generateUUID(),
      title: "New Chat",
      model,
      messages: [],
      createdAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat;
  }, [setChats, setActiveChatId]);

  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, [setActiveChatId]);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    setActiveChatId((prevActive) => {
      if (prevActive === id) {
        const remaining = chats.filter((c) => c.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prevActive;
    });
  }, [chats, setChats, setActiveChatId]);

  const renameChat = useCallback((id: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() || "Untitled Chat" } : c))
    );
  }, [setChats]);

  const clearAllChats = useCallback(() => {
    setChats([]);
    setActiveChatId(null);
  }, [setChats, setActiveChatId]);

  const updateLastAssistantMessage = useCallback(
    (chatId: string, updateFn: (content: string) => string) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const msgs = [...c.messages];
          const lastMsgIndex = msgs.length - 1;
          if (lastMsgIndex >= 0 && msgs[lastMsgIndex].role === "assistant") {
            msgs[lastMsgIndex] = {
              ...msgs[lastMsgIndex],
              content: updateFn(msgs[lastMsgIndex].content),
              timestamp: Date.now(),
            };
          }
          return { ...c, messages: msgs };
        })
      );
    },
    [setChats]
  );
  const runChatStream = useCallback(
    async (
      chatId: string,
      model: string,
      chatPayload: ChatMessagePayload[],
      ollamaUrl: string,
      temperature: number,
      contextLimit: number,
      chatStreamFn: (
        url: string,
        payload: {
          model: string;
          messages: ChatMessagePayload[];
          options?: {
            temperature?: number;
            num_ctx?: number;
          };
        },
        onChunk: (text: string) => void,
        onDone?: () => void,
        onError?: (err: string) => void
      ) => Promise<void>
    ) => {
      setIsGenerating(true);
      setGenerationError(null);

      // Simulate human typing delay
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 800));

      let bufferedText = "";
      let hasStartedStreaming = false;

      await chatStreamFn(
        ollamaUrl,
        {
          model,
          messages: chatPayload,
          options: {
            temperature,
            num_ctx: contextLimit,
          },
        },
        // onChunk
        (text: string) => {
          bufferedText += text;
          if (bufferedText.length >= 120 || hasStartedStreaming) {
            hasStartedStreaming = true;
            updateLastAssistantMessage(chatId, () => bufferedText);
          }
        },
        // onDone
        () => {
          updateLastAssistantMessage(chatId, (current) => bufferedText || current);
          setIsGenerating(false);
        },
        // onError
        (err: string) => {
          setGenerationError(err);
          setIsGenerating(false);
          updateLastAssistantMessage(
            chatId,
            (current) =>
              current +
              `\n\n*(Error: Connection to Ollama failed. Please check if Ollama is running at ${ollamaUrl} and that the model "${model}" is installed.)*`
          );
        }
      );
    },
    [updateLastAssistantMessage]
  );

  const sendMessage = useCallback(
    async (
      content: string,
      ollamaUrl: string,
      model: string,
      systemPrompt: string,
      temperature: number,
      contextLimit: number,
      chatStreamFn: (
        url: string,
        payload: {
          model: string;
          messages: ChatMessagePayload[];
          options?: {
            temperature?: number;
            num_ctx?: number;
          };
        },
        onChunk: (text: string) => void,
        onDone?: () => void,
        onError?: (err: string) => void
      ) => Promise<void>
    ) => {
      if (!content.trim() || isGenerating) return;

      let currentChat = activeChat;
      // If there's no active chat, automatically create one
      if (!currentChat) {
        currentChat = createNewChat(model);
      }

      // Update model of existing chat if it is empty
      if (currentChat.messages.length === 0 && currentChat.model !== model) {
        currentChat.model = model;
      }

      const userMsg: Message = {
        id: generateUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const assistantMsg: Message = {
        id: generateUUID(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      // Add user message and a placeholder assistant message to the current chat
      const updatedMessages = [...currentChat.messages, userMsg];
      
      // Auto-rename chat if it is named "New Chat"
      const isNewChat = currentChat.title === "New Chat";
      const fallbackTitle = content.slice(0, 30) + (content.length > 30 ? "..." : "");
      const currentTitle = isNewChat ? fallbackTitle : currentChat.title;

      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChat!.id
            ? {
                ...c,
                title: currentTitle,
                model,
                messages: [...updatedMessages, assistantMsg],
              }
            : c
        )
      );

      if (isNewChat) {
        const chatIdToRename = currentChat.id;
        fetch("/api/ollama", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-url": ollamaUrl,
            "x-ollama-endpoint": "api/chat",
          },
          body: JSON.stringify({
            model: "gemma3:270m",
            messages: [
              {
                role: "system",
                content: "Generate a short, concise, and clean title (2-4 words, max 30 characters) for a chat session starting with the user message. Return ONLY the title text, without quotes, periods, or extra commentary."
              },
              {
                role: "user",
                content: content
              }
            ],
            stream: false,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("Rename API failed");
            return res.json();
          })
          .then((data) => {
            const generatedTitle = data?.message?.content?.trim();
            if (generatedTitle) {
              const cleanTitle = generatedTitle.replace(/^["']|["']$/g, "").trim().slice(0, 30);
              if (cleanTitle) {
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === chatIdToRename
                      ? { ...c, title: cleanTitle }
                      : c
                  )
                );
              }
            }
          })
          .catch((err) => {
            console.warn("Failed to generate title using gemma3:270m, using fallback", err);
          });
      }

      // Prepare payload with system prompt if provided
      const chatPayload: ChatMessagePayload[] = [];
      if (systemPrompt.trim()) {
        chatPayload.push({ role: "system", content: systemPrompt });
      }
      updatedMessages.forEach((msg) => {
        chatPayload.push({ role: msg.role, content: msg.content });
      });

      await runChatStream(
        currentChat.id,
        model,
        chatPayload,
        ollamaUrl,
        temperature,
        contextLimit,
        chatStreamFn
      );
    },
    [activeChat, createNewChat, isGenerating, setChats, runChatStream]
  );

  const regenerateLastMessage = useCallback(
    async (
      ollamaUrl: string,
      systemPrompt: string,
      temperature: number,
      contextLimit: number,
      chatStreamFn: (
        url: string,
        payload: {
          model: string;
          messages: ChatMessagePayload[];
          options?: {
            temperature?: number;
            num_ctx?: number;
          };
        },
        onChunk: (text: string) => void,
        onDone?: () => void,
        onError?: (err: string) => void
      ) => Promise<void>
    ) => {
      const currentChat = activeChat;
      if (!currentChat || currentChat.messages.length < 2 || isGenerating) return;

      const msgs = [...currentChat.messages];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.role !== "assistant") return;

      // Reset the last message content
      msgs[msgs.length - 1] = {
        ...lastMsg,
        content: "",
        timestamp: Date.now(),
      };

      setChats((prev) =>
        prev.map((c) => (c.id === currentChat.id ? { ...c, messages: msgs } : c))
      );

      // Prepare payload with system prompt if provided
      const chatPayload: ChatMessagePayload[] = [];
      if (systemPrompt.trim()) {
        chatPayload.push({ role: "system", content: systemPrompt });
      }

      // Feed everything EXCEPT the last assistant message
      const historyToFeed = msgs.slice(0, -1);
      historyToFeed.forEach((msg) => {
        chatPayload.push({ role: msg.role, content: msg.content });
      });

      await runChatStream(
        currentChat.id,
        currentChat.model,
        chatPayload,
        ollamaUrl,
        temperature,
        contextLimit,
        chatStreamFn
      );
    },
    [activeChat, isGenerating, setChats, runChatStream]
  );

  return {
    chats,
    activeChat,
    activeChatId,
    isGenerating,
    generationError,
    createNewChat,
    selectChat,
    deleteChat,
    renameChat,
    clearAllChats,
    sendMessage,
    regenerateLastMessage,
  };
}
