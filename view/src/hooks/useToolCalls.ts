import { useEffect, useState } from "react";

export interface ToolCall {
  timestamp: number;
  tool: string;
  input: any;
  output: any;
}

/**
 * Hook to read tool calls from localStorage and listen for updates
 */
export const useToolCalls = () => {
  const [calls, setCalls] = useState<ToolCall[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("toolCalls") ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handler = () => {
      try {
        setCalls(JSON.parse(localStorage.getItem("toolCalls") ?? "[]"));
      } catch {
        setCalls([]);
      }
    };

    // Listen for updates from the same tab
    window.addEventListener("__tool_calls_updated", handler);
    
    // Listen for updates from other tabs
    window.addEventListener("storage", (e) => {
      if (e.key === "toolCalls") {
        handler();
      }
    });

    return () => {
      window.removeEventListener("__tool_calls_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const clearCalls = () => {
    localStorage.removeItem("toolCalls");
    setCalls([]);
    window.dispatchEvent(new CustomEvent("__tool_calls_updated"));
  };

  return { calls, clearCalls };
};
