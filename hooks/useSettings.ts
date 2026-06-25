"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useEffect } from "react";

export interface Settings {
  ollamaUrl: string;
  systemPrompt: string;
  temperature: number;
  theme: "light" | "dark";
  contextLimit: number;
  enableMemory: boolean;
  enableSimulation: boolean;
  simulationInterval: number; // in seconds
  enableNotifications: boolean;
  keepAlive: string;
}

const DEFAULT_SETTINGS: Settings = {
  ollamaUrl: "http://localhost:11434",
  systemPrompt: "You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible while being safe.",
  temperature: 0.7,
  theme: "dark",
  contextLimit: 2048,
  enableMemory: true,
  enableSimulation: false,
  simulationInterval: 900, // 15 minutes default
  enableNotifications: false,
  keepAlive: "30m",
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<Settings>(
    "ilsa-settings",
    DEFAULT_SETTINGS
  );

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Sync theme class with document element
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings.theme]);

  return {
    settings,
    updateSetting,
    resetSettings,
  };
}
