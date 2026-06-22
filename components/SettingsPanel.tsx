"use client";

import React, { useState, useEffect } from "react";
import { Settings } from "../hooks/useSettings";
import { Server, HelpCircle, Sun, Moon, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import Button from "./ui/Button";
import { PERSONAS } from "../lib/personas";

interface SettingsPanelProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onReset: () => void;
  onClearChats: () => void;
  onTestConnection: (url: string) => Promise<boolean>;
  connectionStatus: "connected" | "disconnected" | "checking" | "idle";
}

export function SettingsPanel({
  settings,
  updateSetting,
  onReset,
  onClearChats,
  onTestConnection,
  connectionStatus,
}: SettingsPanelProps) {
  const [localUrl, setLocalUrl] = useState(settings.ollamaUrl);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const activePersona = PERSONAS.find((p) => p.id === settings.selectedPersonaId) || PERSONAS[0];

  // Sync settings when loaded
  useEffect(() => {
    setLocalUrl(settings.ollamaUrl);
  }, [settings.ollamaUrl]);

  const handleUrlSave = () => {
    updateSetting("ollamaUrl", localUrl.trim());
  };

  const handleTest = async () => {
    handleUrlSave();
    const success = await onTestConnection(localUrl.trim());
    setTestResult(success ? "success" : "error");
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Connection Section */}
      <div className="space-y-3.5">
        <label className="flex items-center gap-2 font-semibold text-foreground">
          <Server className="w-4 h-4 text-primary" />
          <span>Ollama Connection URL</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onBlur={handleUrlSave}
            placeholder="http://localhost:11434"
            className="flex-1 bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground font-mono"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTest}
            isLoading={connectionStatus === "checking"}
            className="text-xs shrink-0 rounded-xl py-2 px-3"
          >
            Test
          </Button>
        </div>

        {/* Connection status diagnostics */}
        {testResult === "success" && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Connection verified successfully! Models loaded.</span>
          </div>
        )}
        {testResult === "error" && (
          <div className="flex items-start gap-1.5 text-xs text-destructive font-medium bg-destructive/5 p-2 rounded-xl border border-destructive/10">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span>Could not connect to Ollama.</span>
              <p className="text-[10px] text-muted font-normal leading-normal">
                Make sure Ollama is running. On Windows/Mac, check the taskbar. If you are querying from a remote address, launch Ollama with the environment variable <code className="bg-secondary px-1 py-0.5 rounded text-[9px] font-mono">OLLAMA_ORIGINS="*"</code> set.
              </p>
            </div>
          </div>
        )}
      </div>

      <hr className="border-border/60" />

      {/* Model Parameters */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground block">Agent Persona Character</label>
          <select
            value={settings.selectedPersonaId || "ilsa"}
            onChange={(e) => updateSetting("selectedPersonaId", e.target.value)}
            className="w-full bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground font-sans cursor-pointer"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name} ({p.role})
              </option>
            ))}
          </select>
          {settings.selectedPersonaId !== "custom" && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Currently active: <strong className="text-foreground">{activePersona.name} ({activePersona.role})</strong>. Prompt and temperature parameters are pre-configured. Select "Custom Operative" to edit manually.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-foreground block">System Prompt</label>
          <textarea
            value={settings.selectedPersonaId === "custom" ? settings.systemPrompt : activePersona.systemPrompt}
            onChange={(e) => updateSetting("systemPrompt", e.target.value)}
            disabled={settings.selectedPersonaId !== "custom"}
            rows={3}
            placeholder={settings.selectedPersonaId === "custom" ? "Introduce system instructions..." : "Select Custom Operative to edit..."}
            className={`w-full bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground ${settings.selectedPersonaId !== "custom" ? "opacity-60 cursor-not-allowed bg-secondary/30" : ""}`}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Temperature ({settings.selectedPersonaId === "custom" ? settings.temperature : activePersona.temperature})</span>
            <span className="text-muted font-normal">
              {(settings.selectedPersonaId === "custom" ? settings.temperature : activePersona.temperature) <= 0.3 ? "Precise" : (settings.selectedPersonaId === "custom" ? settings.temperature : activePersona.temperature) >= 1.0 ? "Creative" : "Balanced"}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.1"
            value={settings.selectedPersonaId === "custom" ? settings.temperature : activePersona.temperature}
            onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))}
            disabled={settings.selectedPersonaId !== "custom"}
            className={`w-full accent-primary bg-secondary h-1.5 rounded-full cursor-pointer ${settings.selectedPersonaId !== "custom" ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Context Window Limit ({settings.contextLimit || 2048} tokens)</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="512"
              max="32768"
              step="512"
              value={settings.contextLimit || 2048}
              onChange={(e) => updateSetting("contextLimit", parseInt(e.target.value))}
              className="flex-1 accent-primary bg-secondary h-1.5 rounded-full cursor-pointer"
            />
            <input
              type="number"
              min="512"
              max="131072"
              value={settings.contextLimit || 2048}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) {
                  updateSetting("contextLimit", val);
                }
              }}
              className="w-20 bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-2 py-1 text-center text-xs text-foreground font-mono"
            />
          </div>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Theme Toggles */}
      <div className="space-y-2">
        <label className="font-semibold text-foreground block">Agent Theme Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSetting("theme", "light")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
              settings.theme === "light"
                ? "bg-secondary text-primary border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="w-4 h-4 shrink-0" />
            <span>Tactical Light</span>
          </button>
          <button
            onClick={() => updateSetting("theme", "dark")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-xs font-medium cursor-pointer ${
              settings.theme === "dark"
                ? "bg-secondary text-primary border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            <span>Rogue Dark</span>
          </button>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Danger Zone */}
      <div className="bg-destructive/5 rounded-2xl border border-destructive/10 p-4 space-y-3.5">
        <h4 className="font-bold text-destructive text-xs uppercase tracking-wider">Danger Zone</h4>
        <p className="text-[11px] text-muted-foreground leading-normal">
          This deletes all local chat logs permanently from this browser. This operation cannot be undone.
        </p>
        <Button
          variant="danger"
          size="sm"
          className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl"
          onClick={() => {
            if (confirm("Are you sure you want to delete all chats? This is permanent.")) {
              onClearChats();
            }
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All Chats</span>
        </Button>
      </div>

      {/* Reset settings button */}
      <div className="pt-2 text-center">
        <button
          onClick={onReset}
          className="text-xxs text-muted hover:text-foreground underline transition-colors"
        >
          Reset Settings to Default
        </button>
      </div>
    </div>
  );
}
export default SettingsPanel;
