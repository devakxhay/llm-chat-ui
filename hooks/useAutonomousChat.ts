"use client";

import { useEffect, useRef, useState } from "react";
import { ChatSession } from "./useChat";
import { Settings } from "./useSettings";

interface UseAutonomousChatProps {
  activeChat: ChatSession | undefined;
  selectedModel: string;
  settings: Settings;
  isGenerating: boolean;
  addAssistantMessage: (chatId: string, content: string) => void;
  showNotification: (title: string, options?: NotificationOptions, onClick?: () => void) => Notification | null;
}

export function useAutonomousChat({
  activeChat,
  selectedModel,
  settings,
  isGenerating,
  addAssistantMessage,
  showNotification,
}: UseAutonomousChatProps) {
  const [isUserInactive, setIsUserInactive] = useState(false);
  const [timeSinceLastActivity, setTimeSinceLastActivity] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for reading fresh values inside runSimulation (avoids stale closures)
  const isUserInactiveRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const activeChatRef = useRef(activeChat);
  const isSendingRef = useRef(false);

  // Keep refs in sync on every render
  isUserInactiveRef.current = isUserInactive;
  isGeneratingRef.current = isGenerating;
  activeChatRef.current = activeChat;

  // Inactivity threshold: 10s for 30s testing interval, 45s for others
  const threshold = settings.simulationInterval === 30 ? 10000 : 45000;

  // Track user activity
  useEffect(() => {
    if (typeof window === "undefined" || !settings.enableSimulation) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setIsUserInactive(false);
      setTimeSinceLastActivity(0);
    };

    const activityEvents = ["mousemove", "keypress", "click", "touchstart", "scroll"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Check inactivity every second for smoother dev timer
    const inactivityInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      setTimeSinceLastActivity(elapsed);
      if (elapsed > threshold) {
        setIsUserInactive(true);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityInterval);
    };
  }, [settings.enableSimulation, threshold]);

  // Handle simulation interval timer
  useEffect(() => {
    if (!settings.enableSimulation || !selectedModel || !activeChat || activeChat.messages.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Count consecutive assistant messages at the end of the history
    const messages = activeChat.messages;
    let consecutiveAssistantCount = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        consecutiveAssistantCount++;
      } else {
        break;
      }
    }

    // If the assistant already followed up (consecutive count >= 2), do not send another one.
    // Also, if consecutive count is 0, the last message is user (normal chat replies to this).
    if (consecutiveAssistantCount !== 1) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const runSimulation = async () => {
      // Prevent concurrent simulation runs
      if (isSendingRef.current) return;

      // Read fresh values from refs instead of stale closure values
      if (isGeneratingRef.current || !isUserInactiveRef.current) {
        // Reschedule soon
        scheduleNext(15); 
        return;
      }

      // Re-check consecutive count from the latest activeChat (defense against stale closure)
      const currentChat = activeChatRef.current;
      if (!currentChat || currentChat.messages.length === 0) return;

      let freshCount = 0;
      for (let i = currentChat.messages.length - 1; i >= 0; i--) {
        if (currentChat.messages[i].role === "assistant") {
          freshCount++;
        } else {
          break;
        }
      }
      // Bail out if the count has changed since the effect was set up
      if (freshCount !== 1) return;

      isSendingRef.current = true;

      const chatId = currentChat.id;
      const chatTitle = currentChat.title;
      const history = currentChat.messages.slice(-8); // Limit history
      
      const conversationHistoryString = history
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");

      const prompt = `You are simulating a contact on a real chat service (like WhatsApp/Telegram). 
The user is currently away. Based on the conversation history below, send a follow-up message to the user.
It could be:
- Asking a casual follow-up question related to the topic of discussion.
- Bringing up an interesting idea, thought, or checking in.
- Mentioning something related to past memories or topics.

Keep it very short, natural, casual, and brief like a quick text message (no formal greetings, no robotic language, max 2 sentences). Respond ONLY with the text message content. Do not add quotes.

Conversation history:
${conversationHistoryString}`;

      try {
        const response = await fetch("/api/ollama", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ollama-url": settings.ollamaUrl,
            "x-ollama-endpoint": "api/chat",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: "You are a casual friend sending a short text message." },
              { role: "user", content: prompt }
            ],
            stream: false,
            options: {
              temperature: 0.8,
              num_ctx: settings.contextLimit,
            },
            keep_alive: settings.keepAlive === "-1" ? -1 : settings.keepAlive,
          }),
        });

        if (!response.ok) throw new Error("Failed to get simulation response");
        const data = await response.json();
        const content = data?.message?.content?.trim();

        if (content) {
          // Remove wrapping quotes if the model outputted them
          const cleanedContent = content.replace(/^["']|["']$/g, "").trim();
          
          addAssistantMessage(chatId, cleanedContent);

          if (settings.enableNotifications) {
            showNotification(
              `Message from ${chatTitle}`,
              {
                body: cleanedContent,
                tag: `chat-msg-${chatId}`,
              },
              () => {
                // Focus behavior is handled by useNotification
              }
            );
          }
        }
      } catch (error) {
        console.warn("Autonomous follow-up message failed:", error);
      } finally {
        isSendingRef.current = false;
      }

      // Do NOT call scheduleNext() here. The addAssistantMessage call above will
      // update activeChat, which re-triggers this effect. The consecutiveAssistantCount
      // guard (now 2) will then prevent any further scheduling.
    };

    const scheduleNext = (customSeconds?: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      // Add random jitter to make it feel natural (+/- 20% of interval)
      const intervalSec = customSeconds || settings.simulationInterval;
      const jitter = (Math.random() * 0.4 - 0.2) * intervalSec;
      const delayMs = Math.max(15, intervalSec + jitter) * 1000;

      timerRef.current = setTimeout(runSimulation, delayMs);
    };

    // Schedule the initial check
    scheduleNext();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // Note: isUserInactive and isGenerating are intentionally excluded from deps.
    // They are read via refs inside runSimulation to avoid effect re-triggers
    // that would reset the timer and cause stale-closure issues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.enableSimulation,
    settings.simulationInterval,
    settings.enableNotifications,
    settings.ollamaUrl,
    selectedModel,
    activeChat,
    addAssistantMessage,
    showNotification,
  ]);

  return {
    isUserInactive,
    secondsSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
    inactivityThreshold: Math.round(threshold / 1000),
  };
}
