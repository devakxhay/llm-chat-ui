"use client";

import React, { useState } from "react";
import { Copy, Check, RotateCcw, User, Bot } from "lucide-react";
import { Message } from "../hooks/useChat";

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
  isGenerating: boolean;
}

export function MessageItem({ message, isLast, onRegenerate, isGenerating }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe simple parser to render code blocks, lists, bold text, and paragraphs
  const renderFormattedContent = (text: string) => {
    if (!text) {
      return (
        <div className="flex items-center gap-1.5 py-1.5 px-0.5" aria-label="Typing...">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot" style={{ animationDelay: "300ms" }} />
        </div>
      );
    }

    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Code Block Detection
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const language = lines[0] && !lines[0].includes(" ") ? lines[0] : "";
        const code = language ? lines.slice(1).join("\n") : lines.join("\n");

        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-border/80 bg-stone-900 text-stone-100 font-mono text-xs shadow-inner">
            {language && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-stone-800 text-stone-400 border-b border-stone-800 text-[10px] uppercase font-semibold">
                <span>{language}</span>
                <span className="font-sans">Code</span>
              </div>
            )}
            <pre className="p-4 overflow-x-auto">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Inline code and basic line breaks / styling
      const subParts = part.split(/(\`[^\`]+\`)/g);
      return (
        <div key={index} className="space-y-2 whitespace-pre-wrap break-words leading-relaxed text-sm">
          {subParts.map((subPart, subIndex) => {
            if (subPart.startsWith("`") && subPart.endsWith("`")) {
              return (
                <code key={subIndex} className="px-1.5 py-0.5 rounded-md bg-secondary/80 font-mono text-xs font-semibold text-primary">
                  {subPart.slice(1, -1)}
                </code>
              );
            }

            // Bold styling parser
            const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g);
            return boldParts.map((boldPart, boldIndex) => {
              if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
                return (
                  <strong key={boldIndex} className="font-semibold text-foreground">
                    {boldPart.slice(2, -2)}
                  </strong>
                );
              }
              return boldPart;
            });
          })}
        </div>
      );
    });
  };

  return (
    <div className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}>
      <div className="flex flex-col max-w-[85%] sm:max-w-[75%] gap-0.5 group">
        <div
          className={`px-3.5 py-1.5 rounded-2xl shadow-xxs ${isUser
              ? "bg-primary text-primary-foreground rounded-br-xs"
              : "bg-card text-foreground border border-border/50 rounded-bl-xs"
            }`}
        >
          {renderFormattedContent(message.content)}
        </div>

        {/* Action Row */}
        <div className={`flex items-center gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1 text-[10px] text-muted ${isUser ? "justify-end" : "justify-start"}`}>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 p-1 hover:bg-secondary rounded transition-colors"
            title="Copy message"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          {!isUser && isLast && onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-1 p-1 hover:bg-secondary rounded disabled:opacity-50 transition-colors"
              title="Regenerate message"
            >
              <RotateCcw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
export default MessageItem;
