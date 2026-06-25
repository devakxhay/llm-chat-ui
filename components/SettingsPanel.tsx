"use client";

import React, { useState, useEffect } from "react";
import { Settings } from "../hooks/useSettings";
import { Server, HelpCircle, Sun, Moon, Trash2, CheckCircle2, AlertCircle, Brain, Plus, X, MessageSquare, Bell } from "lucide-react";
import Button from "./ui/Button";
import { useNotification } from "../hooks/useNotification";

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
  const { permission, requestPermission } = useNotification();
  const [localUrl, setLocalUrl] = useState(settings.ollamaUrl);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const [memories, setMemories] = useState<string[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);

  useEffect(() => {
    if (settings.enableMemory) {
      fetchMemories();
    }
  }, [settings.enableMemory]);

  const fetchMemories = async () => {
    setIsLoadingMemories(true);
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
      console.error("Error fetching memories:", err);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  const saveMemories = async (updated: string[]) => {
    setMemories(updated);
    try {
      await fetch("/api/kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "assistant-memory", value: updated }),
      });
    } catch (err) {
      console.error("Error saving memories:", err);
    }
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const updated = [...memories, newMemory.trim()];
    saveMemories(updated);
    setNewMemory("");
  };

  const handleDeleteMemory = (index: number) => {
    const updated = memories.filter((_, i) => i !== index);
    saveMemories(updated);
  };

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
          <label className="font-semibold text-foreground block">System Prompt</label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => updateSetting("systemPrompt", e.target.value)}
            rows={3}
            placeholder="Introduce system instructions..."
            className="w-full bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Temperature ({settings.temperature})</span>
            <span className="text-muted font-normal">
              {settings.temperature <= 0.3 ? "Precise" : settings.temperature >= 1.0 ? "Creative" : "Balanced"}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))}
            className="w-full accent-primary bg-secondary h-1.5 rounded-full cursor-pointer"
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

        <div className="space-y-1.5">
          <label className="font-semibold text-foreground block text-xs">Keep Alive Duration</label>
          <select
            value={settings.keepAlive || "30m"}
            onChange={(e) => updateSetting("keepAlive", e.target.value)}
            className="w-full bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground cursor-pointer"
          >
            <option value="5m">5 Minutes (Default)</option>
            <option value="30m">30 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="-1">Indefinite (Keep in memory)</option>
            <option value="0">Unload immediately</option>
          </select>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Memory Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-semibold text-foreground">
            <Brain className="w-4 h-4 text-primary" />
            <span>Assistant Memory</span>
          </label>
          <button
            onClick={() => updateSetting("enableMemory", !settings.enableMemory)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.enableMemory ? "bg-primary" : "bg-secondary"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.enableMemory ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {settings.enableMemory && (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground leading-normal font-sans">
              The assistant will remember these key details about you across chats. You can add or delete memories manually here, or let them extract dynamically during conversation.
            </p>

            {/* List memories */}
            <div className="bg-secondary/30 rounded-xl border border-border/50 max-h-[160px] overflow-y-auto p-2 space-y-1.5">
              {isLoadingMemories ? (
                <div className="text-xxs text-muted p-2 text-center">Loading memories...</div>
              ) : memories.length === 0 ? (
                <div className="text-xxs text-muted p-2 text-center">No memories stored yet.</div>
              ) : (
                memories.map((fact, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 bg-card/60 px-2.5 py-1.5 rounded-lg border border-border/20 text-xs">
                    <span className="text-foreground leading-normal font-sans">{fact}</span>
                    <button
                      onClick={() => handleDeleteMemory(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add memory input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Remember a new fact..."
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMemory();
                  }
                }}
                className="flex-1 bg-card border border-border focus:border-primary/80 focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1.5 text-xs focus:outline-none text-foreground font-sans"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddMemory}
                className="px-2.5 py-1.5 rounded-xl shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <hr className="border-border/60" />

      {/* Autonomous Messaging and Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-semibold text-foreground">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Autonomous Messaging</span>
          </label>
          <button
            onClick={() => updateSetting("enableSimulation", !settings.enableSimulation)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.enableSimulation ? "bg-primary" : "bg-secondary"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.enableSimulation ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {settings.enableSimulation && (
          <div className="space-y-4 pl-6 border-l border-border/60 ml-2 font-sans">
            {/* Notification toggle */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
                <Bell className="w-3.5 h-3.5 text-primary/80" />
                <span>Browser Notifications</span>
              </label>
              <button
                onClick={async () => {
                  if (!settings.enableNotifications) {
                    const granted = await requestPermission();
                    if (granted) {
                      updateSetting("enableNotifications", true);
                    } else {
                      alert("Permission denied. Enable notifications in your browser settings to use this feature.");
                    }
                  } else {
                    updateSetting("enableNotifications", false);
                  }
                }}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enableNotifications ? "bg-primary" : "bg-secondary"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enableNotifications ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Messaging Frequency Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-foreground/80">
                <span>Check Frequency</span>
                <span className="text-muted text-[10px]">
                  {settings.simulationInterval === 30 ? "Testing (30s)" :
                   settings.simulationInterval === 300 ? "Frequent (5m)" :
                   settings.simulationInterval === 900 ? "Balanced (15m)" :
                   settings.simulationInterval === 1800 ? "Casual (30m)" :
                   settings.simulationInterval === 3600 ? "Rare (1h)" : "Custom"}
                </span>
              </div>
              <select
                value={settings.simulationInterval}
                onChange={(e) => updateSetting("simulationInterval", parseInt(e.target.value))}
                className="w-full bg-card border border-border focus:border-primary/80 focus:ring-1 focus:ring-primary/20 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground font-sans cursor-pointer"
              >
                <option value={30}>Testing (30 seconds)</option>
                <option value={300}>Frequent (5 minutes)</option>
                <option value={900}>Balanced (15 minutes)</option>
                <option value={1800}>Casual (30 minutes)</option>
                <option value={3600}>Rare (1 hour)</option>
              </select>
              <p className="text-[10px] text-muted-foreground/80 leading-normal">
                When active, the AI will autonomously send a follow-up or check-in message after this period of inactivity.
              </p>
            </div>
          </div>
        )}
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
