"use client";

import { useState, useEffect, useCallback, Dispatch, SetStateAction, useRef } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const pendingValueRef = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await fetch(`/api/kv?key=${encodeURIComponent(key)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.value !== null && isMounted) {
            setState(data.value);
          }
        }
      } catch (error) {
        console.warn(`Error reading SQLite key "${key}":`, error);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [key]);

  // Flush any pending write immediately on unmount or key change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingValueRef.current !== null) {
        const valueToSave = pendingValueRef.current;
        // Run a fire-and-forget save
        fetch("/api/kv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ key, value: valueToSave }),
        }).catch((error) => {
          console.warn(`Error flushing SQLite key "${key}":`, error);
        });
      }
    };
  }, [key]);

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      try {
        setState((prev) => {
          const newValue = value instanceof Function ? value(prev) : value;
          pendingValueRef.current = newValue;

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            fetch("/api/kv", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ key, value: newValue }),
            })
              .then(() => {
                pendingValueRef.current = null;
              })
              .catch((error) => {
                console.warn(`Error setting SQLite key "${key}":`, error);
              });
          }, 1000); // Debounce write by 1 second

          return newValue;
        });
      } catch (error) {
        console.warn(`Error setting SQLite key "${key}":`, error);
      }
    },
    [key]
  );

  return [state, setValue];
}

