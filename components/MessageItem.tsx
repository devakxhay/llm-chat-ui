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
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to parse inline bold/code/italic tags
  const parseInline = (text: string, isUser: boolean) => {
    const subParts = text.split(/(\`[^\`]+\`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return subParts.map((subPart, subIndex) => {
      if (subPart.startsWith("`") && subPart.endsWith("`")) {
        return (
          <code key={subIndex} className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold ${
            isUser 
              ? "bg-white/20 text-white border border-white/10" 
              : "bg-secondary text-primary border border-border/40"
          }`}>
            {subPart.slice(1, -1)}
          </code>
        );
      }
      if (subPart.startsWith("**") && subPart.endsWith("**")) {
        return (
          <strong key={subIndex} className={`font-bold ${
            isUser 
              ? "text-amber-200 dark:text-amber-100 drop-shadow-sm font-extrabold" 
              : "text-indigo-600 dark:text-indigo-400 font-extrabold"
          }`}>
            {subPart.slice(2, -2)}
          </strong>
        );
      }
      if (subPart.startsWith("*") && subPart.endsWith("*")) {
        return (
          <em key={subIndex} className={`italic font-semibold ${
            isUser 
              ? "text-sky-200 dark:text-sky-100" 
              : "text-emerald-600 dark:text-emerald-500"
          }`}>
            {subPart.slice(1, -1)}
          </em>
        );
      }
      return subPart;
    });
  };

  // Safe simple parser to render code blocks, lists, bold text, and paragraphs
  const renderFormattedContent = (text: string) => {
    if (!text) {
      return (
        <div className="flex items-center gap-1.5 py-1 px-0.5" aria-label="Typing...">
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
        const blockIdx = index;

        return (
          <div key={index} className="my-2 overflow-hidden rounded-lg border border-border/80 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between px-3 py-1 bg-[#252526] text-stone-400 border-b border-border/40 text-[9px] uppercase font-semibold">
              <span>{language || "code"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode(code, blockIdx);
                }}
                className="hover:text-foreground text-[9px] transition-colors flex items-center gap-1 font-sans cursor-pointer lowercase"
              >
                {copiedCodeIdx === blockIdx ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-green-500" />
                    <span>copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5" />
                    <span>copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 overflow-x-auto leading-normal">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Inline and structured blocks
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1">
          {lines.map((line, lineIdx) => {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith("### ")) {
              return <h4 key={lineIdx} className="text-xs font-bold mt-1 mb-0.5">{parseInline(trimmedLine.slice(4), isUser)}</h4>;
            }
            if (trimmedLine.startsWith("## ")) {
              return <h3 key={lineIdx} className="text-sm font-bold mt-2 mb-0.5">{parseInline(trimmedLine.slice(3), isUser)}</h3>;
            }
            if (trimmedLine.startsWith("# ")) {
              return <h2 key={lineIdx} className="text-base font-bold mt-2 mb-1">{parseInline(trimmedLine.slice(2), isUser)}</h2>;
            }

            // Bullet Lists
            if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
              return (
                <div key={lineIdx} className={`flex items-start gap-1 ml-1 text-xs leading-normal font-sans ${isUser ? "text-primary-foreground/90" : "text-foreground/90"}`}>
                  <span className={`${isUser ? "text-white/80" : "text-primary"} mt-1 text-[8px]`}>•</span>
                  <span className="flex-1">{parseInline(trimmedLine.slice(2), isUser)}</span>
                </div>
              );
            }

            // Numbered Lists
            const numMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              return (
                <div key={lineIdx} className={`flex items-start gap-1 ml-1 text-xs leading-normal font-sans ${isUser ? "text-primary-foreground/90" : "text-foreground/90"}`}>
                  <span className={`${isUser ? "text-white/80" : "text-primary"} font-mono text-[8px] font-bold`}>{numMatch[1]}.</span>
                  <span className="flex-1">{parseInline(numMatch[2], isUser)}</span>
                </div>
              );
            }

            if (!trimmedLine) {
              return <div key={lineIdx} className="h-1" />;
            }

            return (
              <p key={lineIdx} className={`text-xs sm:text-sm leading-normal font-sans break-words ${isUser ? "text-primary-foreground/90" : "text-foreground/90"}`}>
                {parseInline(line, isUser)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className={`flex w-full gap-2 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}>
      <div className="flex flex-col max-w-[90%] sm:max-w-[80%] gap-0.5 group">
        <div
          className={`px-3 py-1 rounded-xl shadow-xxs ${isUser
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
