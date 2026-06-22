"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, Trash2, Edit2, Check, X, Settings, Database } from "lucide-react";
import { ChatSession } from "../hooks/useChat";
import Button from "./ui/Button";

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onCreateNewChat: () => void;
  onOpenSettings: () => void;
  connectionStatus: "connected" | "disconnected" | "checking" | "idle";
  activeModel: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onCreateNewChat,
  onOpenSettings,
  connectionStatus,
  activeModel,
  isOpen,
  onClose,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (chat: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle);
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r border-border text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-foreground">Ilsa</h1>
            <p className="text-xxs text-muted leading-none">Local LLM Chat</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-muted" />
        </Button>
      </div>

      {/* Action Area */}
      <div className="p-3">
        <Button
          variant="primary"
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-3"
          onClick={() => {
            onCreateNewChat();
            onClose(); // Auto close on mobile
          }}
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {chats.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-muted">
            No chats yet. Start one above!
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditing = chat.id === editingId;

            return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  onClose(); // Auto close on mobile
                }}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => saveRename(chat.id, e)}
                    className="flex items-center gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      className="flex-1 bg-background text-foreground border border-primary px-2 py-1 text-xs rounded-lg focus:outline-none"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={(e) => saveRename(chat.id, e)}
                      className="p-1 text-primary hover:bg-background rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      className="p-1 text-muted hover:bg-background rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 overflow-hidden w-[75%]">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted"}`} />
                      <span className="truncate text-xs">{chat.title}</span>
                    </div>

                    {/* Desktop Hover Action Buttons */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-2 transition-opacity duration-150">
                      <button
                        onClick={(e) => startEditing(chat, e)}
                        className="p-1 hover:bg-secondary rounded text-muted hover:text-foreground"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="p-1 hover:bg-destructive/10 rounded text-muted hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Status Area */}
      <div className="p-3 border-t border-border bg-card/60 space-y-2">
        <div className="flex items-center justify-between px-2 py-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${connectionStatus === "connected"
                  ? "bg-green-500 animate-pulse"
                  : connectionStatus === "checking"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
            />
            <span className="text-muted-foreground font-mono text-[10px]">
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "checking"
                  ? "Checking..."
                  : "Offline"}
            </span>
          </div>
          {activeModel && (
            <span className="text-xxs bg-secondary/80 text-secondary-foreground px-1.5 py-0.5 rounded-md max-w-[100px] truncate" title={activeModel}>
              {activeModel}
            </span>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2 rounded-xl text-xs py-2"
          onClick={() => {
            onOpenSettings();
            onClose(); // Auto close on mobile
          }}
        >
          <Settings className="w-3.5 h-3.5 text-muted" />
          <span>Connection Settings</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Slide-over Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-[#2c221e]/40 dark:bg-black/60 backdrop-blur-xxs md:hidden transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Mobile Sidebar Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[280px] md:hidden transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex flex-col w-[260px] h-full flex-shrink-0">
        {sidebarContent}
      </div>
    </>
  );
}
export default Sidebar;
