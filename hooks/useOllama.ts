"use client";

import { useState, useCallback } from "react";

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

export function useOllama() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking" | "idle">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const testConnection = useCallback(async (url: string): Promise<boolean> => {
    setConnectionStatus("checking");
    setErrorMsg(null);
    try {
      const response = await fetch("/api/ollama", {
        method: "GET",
        headers: {
          "x-ollama-url": url,
          "x-ollama-endpoint": "api/tags",
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.models)) {
        setModels(data.models);
        setConnectionStatus("connected");
        return true;
      }
      throw new Error("Invalid response format from Ollama (missing models list)");
    } catch (err: any) {
      setConnectionStatus("disconnected");
      setErrorMsg(err.message || "Failed to connect to Ollama server");
      setModels([]);
      return false;
    }
  }, []);

  const fetchModels = useCallback(async (url: string) => {
    setIsLoadingModels(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/ollama", {
        method: "GET",
        headers: {
          "x-ollama-url": url,
          "x-ollama-endpoint": "api/tags",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.statusText}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.models)) {
        setModels(data.models);
        setConnectionStatus("connected");
      } else {
        throw new Error("Invalid response format from Ollama");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load models");
      setConnectionStatus("disconnected");
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const chatStream = useCallback(
    async (
      url: string,
      payload: {
        model: string;
        messages: ChatMessagePayload[];
        options?: {
          temperature?: number;
          num_ctx?: number;
        };
        keep_alive?: string | number;
      },
      onChunk: (text: string) => void,
      onDone?: () => void,
      onError?: (err: string) => void
    ) => {
      try {
        const response = await fetch("/api/ollama", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-url": url,
            "x-ollama-endpoint": "api/chat",
          },
          body: JSON.stringify({
            ...payload,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to start chat: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No stream reader available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          // Keep the last partial line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.message?.content) {
                onChunk(parsed.message.content);
              }
              if (parsed.done) {
                if (onDone) onDone();
              }
            } catch (err) {
              console.warn("Failed to parse stream chunk:", trimmed, err);
            }
          }
        }

        // Process any remaining data in the buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            if (parsed.message?.content) {
              onChunk(parsed.message.content);
            }
          } catch (err) {
            // Ignored
          }
        }

        if (onDone) onDone();
      } catch (err: any) {
        console.error("Stream error:", err);
        if (onError) {
          onError(err.message || "An error occurred during streaming");
        }
      }
    },
    []
  );

  return {
    models,
    isLoadingModels,
    connectionStatus,
    errorMsg,
    testConnection,
    fetchModels,
    chatStream,
  };
}
