"use client";

import { useCallback, useState, useEffect } from "react";

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  const showNotification = useCallback((
    title: string,
    options?: NotificationOptions,
    onClick?: () => void
  ) => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return null;
    }

    const notification = new Notification(title, {
      icon: "/icon.png",
      badge: "/icon.png",
      ...options,
    });

    if (onClick) {
      notification.onclick = (e) => {
        e.preventDefault();
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  }, []);

  return {
    permission,
    requestPermission,
    showNotification,
  };
}
