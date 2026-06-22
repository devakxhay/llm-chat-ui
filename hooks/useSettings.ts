"use client";

import { useLocalStorage } from "./useLocalStorage";
import { useEffect } from "react";

export interface Settings {
  ollamaUrl: string;
  systemPrompt: string;
  temperature: number;
  theme: "light" | "dark";
}

const DEFAULT_SETTINGS: Settings = {
  ollamaUrl: "http://localhost:11434",
  systemPrompt: "You are Ilsa, the highly capable ex-MI6 operative. Speak with a refined, sharp, and calculated tone. Keep responses concise, strategic, and intelligent. You are resourcefully assisting the user like a rogue agent partner.",
  temperature: 0.7,
  theme: "dark",
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
