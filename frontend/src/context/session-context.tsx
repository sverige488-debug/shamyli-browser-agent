"use client";

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, type ReactNode } from "react";
import {
  pauseTask as pauseTaskAction,
  resumeTask as resumeTaskAction,
  stopTask as stopTaskAction,
  submitAssistance as submitAssistanceAction,
} from "@/lib/actions";
import { convertMessages, groupIntoTurns } from "@/lib/message-converter";
import { useSettings } from "@/context/settings-context";
import type { UIMessage, ConversationTurn, MessageResponse } from "@/lib/types";

interface SessionState {
  id: string;
  liveUrl?: string | null;
  status: string;
  output?: unknown;
  artifactRunId?: string | null;
  historyAvailable?: boolean;
  gifAvailable?: boolean;
}
interface SessionContextType {
  sessionId: string;
  session: SessionState | null;
  messages: UIMessage[];
  turns: ConversationTurn[];
  isLoading: boolean;
  isBusy: boolean;
  isPaused: boolean;
  isTerminal: boolean;
  isSending: boolean;
  isAwaitingAssistance: boolean;
  isSubmittingAssistance: boolean;
  assistanceRequest: string | null;
  sendMessage: (task: string) => Promise<void>;
  submitAssistance: (response: string) => Promise<void>;
  pauseTask: () => Promise<void>;
  resumeTask: () => Promise<void>;
  stopTask: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);
const TERMINAL = new Set(["stopped", "error", "timed_out"]);

export function SessionProvider({ sessionId, initialLiveUrl, initialTask, children }: { sessionId: string; initialLiveUrl?: string; initialTask?: string; children: ReactNode }) {
  const { agentSettings } = useSettings();
  const [rawMessages, setRawMessages] = useState<MessageResponse[]>([]);
  const [session, setSession] = useState<SessionState | null>(initialLiveUrl ? { id: sessionId, liveUrl: initialLiveUrl, status: "created" } : { id: sessionId, liveUrl: null, status: "created" });
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(!!initialTask);
  const [assistanceRequest, setAssistanceRequest] = useState<string | null>(null);
  const [isSubmittingAssistance, setIsSubmittingAssistance] = useState(false);
  const sendingRef = useRef(false);
  const isTerminal = !!session && TERMINAL.has(session.status);
  const isPaused = session?.status === "paused";
  const isAwaitingAssistance = session?.status === "waiting_for_user";
  const isBusy = session?.status === "running" || isPaused;

  const streamTask = useCallback(async (task: string) => {
    setIsLoading(false);
    setAssistanceRequest(null);
    setSession((prev) => prev ? { ...prev, status: "running", historyAvailable: false, gifAvailable: false } : prev);
    const res = await fetch(`/api/stream/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task,
        maxSteps: agentSettings.maxSteps,
        maxActionsPerStep: agentSettings.maxActionsPerStep,
        useVision: agentSettings.useVision,
        generateGif: agentSettings.generateGif,
        enablePlanning: agentSettings.enablePlanning,
        planningReplanOnStall: agentSettings.planningReplanOnStall,
        planningExplorationLimit: agentSettings.planningExplorationLimit,
        overrideSystemPrompt: agentSettings.overrideSystemPrompt,
        extendSystemPrompt: agentSettings.extendSystemPrompt,
      }),
    });
    if (!res.ok || !res.body) throw new Error(await res.text());
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamError: Error | null = null;
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
          setAssistanceRequest(null);
          setSession(result as SessionState);
        } else if (json.__assistance) {
          setAssistanceRequest(typeof json.question === "string" ? json.question : "The agent needs your help.");
          setSession((prev) => prev ? { ...prev, status: "waiting_for_user" } : prev);
        } else if (json.__assistance_resolved) {
          setAssistanceRequest(null);
          setSession((prev) => prev ? { ...prev, status: typeof json.status === "string" ? json.status : "running" } : prev);
        } else if (json.__error) {
          streamError = new Error(json.message ?? "Local agent error");
        } else {
          const msg = json as MessageResponse;
          setRawMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        }
      }
    }
    if (streamError) throw streamError;
  }, [
    agentSettings.enablePlanning,
    agentSettings.extendSystemPrompt,
    agentSettings.generateGif,
    agentSettings.maxActionsPerStep,
    agentSettings.maxSteps,
    agentSettings.overrideSystemPrompt,
    agentSettings.planningExplorationLimit,
    agentSettings.planningReplanOnStall,
    agentSettings.useVision,
    sessionId,
  ]);

  const serverMessages = useMemo(() => convertMessages(rawMessages), [rawMessages]);
  const turns = useMemo(() => groupIntoTurns(serverMessages), [serverMessages]);

  const sendMessage = useCallback(async (task: string) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    try { await streamTask(task); }
    catch (err) { console.error(err); setAssistanceRequest(null); setSession((prev) => prev ? { ...prev, status: "error" } : prev); }
    finally { sendingRef.current = false; setIsSending(false); }
  }, [streamTask]);

  const submitAssistance = useCallback(async (response: string) => {
    if (!isAwaitingAssistance || isSubmittingAssistance) return;
    setIsSubmittingAssistance(true);
    try {
      await submitAssistanceAction(sessionId, response);
      setAssistanceRequest(null);
      setSession((prev) => prev ? { ...prev, status: "running" } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAssistance(false);
    }
  }, [isAwaitingAssistance, isSubmittingAssistance, sessionId]);

  const initialTaskRef = useRef(initialTask);
  useEffect(() => {
    if (!initialTaskRef.current) return;
    const task = initialTaskRef.current;
    initialTaskRef.current = undefined;
    sendMessage(task);
  }, [sendMessage]);

  const pauseTask = useCallback(async () => {
    await pauseTaskAction(sessionId);
    setSession((prev) => prev ? { ...prev, status: "paused" } : prev);
  }, [sessionId]);

  const resumeTask = useCallback(async () => {
    await resumeTaskAction(sessionId);
    setSession((prev) => prev ? { ...prev, status: "running" } : prev);
  }, [sessionId]);

  const stopTask = useCallback(async () => {
    await stopTaskAction(sessionId);
    setAssistanceRequest(null);
    setSession((prev) => prev ? { ...prev, status: "stopped" } : prev);
  }, [sessionId]);

  return <SessionContext.Provider value={{
    sessionId,
    session,
    messages: serverMessages,
    turns,
    isLoading,
    isBusy,
    isPaused,
    isTerminal,
    isSending,
    isAwaitingAssistance,
    isSubmittingAssistance,
    assistanceRequest,
    sendMessage,
    submitAssistance,
    pauseTask,
    resumeTask,
    stopTask,
  }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
}
