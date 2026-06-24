"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Menu, Settings as SettingsIcon, ChevronDown, Check } from "lucide-react";
import { ChatSession } from "../hooks/useChat";
import { OllamaModel } from "../hooks/useOllama";
import { Settings } from "../hooks/useSettings";
import MessageItem from "./MessageItem";
import Button from "./ui/Button";

interface ChatWindowProps {
  activeChat: ChatSession | undefined;
  models: OllamaModel[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onSendMessage: (content: string) => void;
  isGenerating: boolean;
  onRegenerate: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  connectionStatus: "connected" | "disconnected" | "checking" | "idle";
  settings: Settings;
  onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const QUICK_PROMPTS = [
  { label: " Vienna Opera Escape", text: "Design a step-by-step extraction plan for an asset inside the Vienna State Opera house." },
  { label: " Tactical Breaching", text: "What is the most effective tactical method to bypass a secured air-gapped server room?" },
  { label: " Rogue Agent Protocol", text: "Explain the protocols and countermeasures an operative should take when disavowed by MI6." },
  { label: " Syndicate Intel", text: "Analyze potential structural vulnerabilities in a highly decentralized rogue intelligence syndicate." },
];

export function ChatWindow({
  activeChat,
  models,
  selectedModel,
  onSelectModel,
  onSendMessage,
  isGenerating,
  onRegenerate,
  onToggleSidebar,
  onOpenSettings,
  connectionStatus,
  settings,
  onUpdateSetting,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Token calculation helpers
  const estimateTokens = (text: string): number => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.max(Math.ceil(words * 1.3), Math.ceil(text.length / 4));
  };

  const systemTokens = estimateTokens(settings?.systemPrompt || "");
  const messagesTokens = activeChat?.messages.reduce((acc, msg) => acc + estimateTokens(msg.content), 0) || 0;
  const inputTokens = estimateTokens(input);
  const totalTokens = systemTokens + messagesTokens + inputTokens;
  const maxTokens = settings?.contextLimit || 2048;
  const percentUsed = Math.min((totalTokens / maxTokens) * 100, 100);

  const isChatModel = !selectedModel || (
    !selectedModel.toLowerCase().includes("embed") && 
    !selectedModel.toLowerCase().includes("rerank") && 
    !selectedModel.toLowerCase().includes("bge") && 
    !selectedModel.toLowerCase().includes("colbert")
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages, isGenerating]);

  // Handle auto-resizing of text area
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickPromptClick = (text: string) => {
    onSendMessage(text);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </Button>

          {/* Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/40 text-xs font-semibold transition-all text-foreground cursor-pointer"
            >
              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                {selectedModel || "No models loaded"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted" />
            </button>

            {showModelDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowModelDropdown(false)}
                />
                <div className="absolute left-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-lg z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-xxs font-semibold text-muted border-b border-border mb-1 uppercase tracking-wider">
                    Select Local Model
                  </div>
                  {models.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted">
                      No models found. Connect to Ollama or configure URL.
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto">
                      {models.map((model) => (
                        <button
                          key={model.name}
                          onClick={() => {
                            onSelectModel(model.name);
                            setShowModelDropdown(false);
                          }}
                          className="flex items-center justify-between w-full px-3 py-2 text-xs text-left hover:bg-secondary transition-colors text-foreground cursor-pointer"
                        >
                          <span className="font-mono truncate">{model.name}</span>
                          {selectedModel === model.name && (
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            title="Configure connection settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-muted hover:text-foreground transition-colors" />
          </Button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!activeChat || activeChat.messages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4 space-y-5 animate-in fade-in duration-300">
            <div className="space-y-2.5">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Operative Status: Active
              </h2>
              <p className="text-xs text-muted max-w-md mx-auto leading-normal">
                Establish a connection to the secure server and choose an intelligence model to begin communication.
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {QUICK_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickPromptClick(prompt.text)}
                  className="flex flex-col text-left p-3 rounded-xl bg-card hover:bg-secondary/40 border border-border/40 hover:border-border transition-all duration-200 shadow-xxs hover:shadow-xs group cursor-pointer"
                >
                  <span className="font-semibold text-xxs text-foreground group-hover:text-primary transition-colors mb-0.5">
                    {prompt.label}
                  </span>
                  <span className="text-[10px] text-muted line-clamp-2">
                    {prompt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages Feed */
          <div className="max-w-2xl mx-auto space-y-2 pb-1">
            {activeChat.messages.map((message, index) => {
              // Hide empty assistant messages, unless it's the last one which is generating
              if (
                message.role === "assistant" &&
                !message.content.trim() &&
                index !== activeChat.messages.length - 1
              ) {
                return null;
              }

              const isLast = index === activeChat.messages.length - 1;
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  isLast={isLast}
                  onRegenerate={onRegenerate}
                  isGenerating={isGenerating}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Bottom Bar */}
      <footer className="bg-background/95 backdrop-blur-md px-4 py-3 pb-safe-bottom border-t border-border/40 space-y-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-3 text-[10px] text-muted select-none">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground/70">Context Window Used:</span>
            <span className={`font-mono font-bold ${percentUsed > 90 ? 'text-destructive' : percentUsed > 75 ? 'text-amber-500 font-bold' : 'text-primary font-bold'}`}>
              {totalTokens.toLocaleString()}
            </span>
            <span className="opacity-40">/</span>
            <span className="font-mono text-muted">{maxTokens.toLocaleString()} tokens</span>
            <span className={`font-mono px-1 rounded-sm ml-0.5 ${percentUsed > 90 ? 'bg-destructive/10 text-destructive' : percentUsed > 75 ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
              {Math.round(percentUsed)}%
            </span>
          </div>
          <div className="w-24 sm:w-32 bg-secondary border border-border/40 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                percentUsed > 90 ? 'bg-destructive' : percentUsed > 75 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative flex items-center bg-card rounded-full border border-border/60 px-3 py-1.5 focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-150">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              connectionStatus !== "connected"
                ? "Server offline..."
                : `Message • (${selectedModel || "model"})...`
            }
            className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-sm py-1 px-3 resize-none text-foreground placeholder-muted font-sans w-full max-h-[120px]"
            style={{ maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating || connectionStatus !== "connected"}
            className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-30 disabled:hover:opacity-30 hover:opacity-90 transition-all duration-150 ml-1.5 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
export default ChatWindow;
