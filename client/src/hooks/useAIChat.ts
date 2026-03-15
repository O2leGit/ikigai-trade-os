import { useState, useCallback } from "react";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function useAIChat(portfolioContext?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: "user", content };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            portfolioContext,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `Request failed: ${res.status}`
          );
        }

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.content,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to get AI response";
        setError(msg);
        // Add error as assistant message so user sees it
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `**Error:** ${msg}\n\nMake sure ANTHROPIC_API_KEY is set in your Netlify environment variables.`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, portfolioContext]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
}
