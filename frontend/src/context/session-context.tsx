"use client";

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from "react";
import { stopTask as stopTaskAction } from "@/lib/actions";
import { convertMessages, groupIntoTurns } from "@/lib/message-converter";
import type { UIMessage, ConversationTurn, MessageResponse } from "@/lib/types";

interface SessionState { id: string; liveUrl?: string | null; status: string; output?: unknown; }
interface SessionContextType {
  sessionId: string;
  session: SessionState | null;
  messages: UIMessage[];
  turns: ConversationTurn[];
  isLoading: boolean;
  isBusy: boolean;
  isTerminal: boolean;
  isSending: boolean;
  sendMessage: (task: string) => Promise<void>;
  stopTask: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);
const TERMINAL = new Set(["stopped", "error", "timed_out"]);

export function SessionProvider({ sessionId, initialLiveUrl, initialTask, children }: { sessionId: string; initialLiveUrl?: string; initialTask?: string; children: ReactNode }) {
  const [rawMessages, setRawMessages] = useState<MessageResponse[]>([]);
  const [session, setSession] = useState<SessionState | null>(initialLiveUrl ? { id: sessionId, liveUrl: initialLiveUrl, status: "created" } : { id: sessionId, liveUrl: null, status: "created" });
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(!!initialTask);
  const sendingRef = useRef(false);
  const isTerminal = !!session && TERMINAL.has(session.status);
  const isBusy = session?.status === "running";

  const streamTask = useCallback(async (task: string) => {
    setIsLoading(false);
    setSession((prev) => prev ? { ...prev, status: "running" } : prev);
    const res = await fetch(`/api/stream/${sessionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task }) });
    if (!res.ok || !res.body) throw new Error(await res.text());
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = JSON.parse(line.slice(6));
        if (json.__done) {
          const { __done, ...result } = json;
          setSession(result as SessionState);
        } else if (json.__error) {
          throw new Error(json.message ?? "Local agent error");
        } else {
          const msg = json as MessageResponse;
          setRawMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }
      }
    }
  }, [sessionId]);

  const serverMessages = useMemo(() => convertMessages(rawMessages), [rawMessages]);
  const turns = useMemo(() => groupIntoTurns(serverMessages), [serverMessages]);

  const sendMessage = useCallback(async (task: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    try { await streamTask(task); }
    catch (err) { console.error(err); setSession((prev) => prev ? { ...prev, status: "error" } : prev); }
    finally { sendingRef.current = false; setIsSending(false); }
  }, [streamTask]);

  const initialTaskRef = useRef(initialTask);
  useEffect(() => {
    if (!initialTaskRef.current) return;
    const task = initialTaskRef.current;
    initialTaskRef.current = undefined;
    sendMessage(task);
  }, [sendMessage]);

  const stopTask = useCallback(async () => {
    await stopTaskAction(sessionId);
    setSession((prev) => prev ? { ...prev, status: "stopped" } : prev);
  }, [sessionId]);

  return <SessionContext.Provider value={{ sessionId, session, messages: serverMessages, turns, isLoading, isBusy, isTerminal, isSending, sendMessage, stopTask }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
}
