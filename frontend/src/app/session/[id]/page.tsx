"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { CircleHelp, Pause, Play, Square } from "lucide-react";
import { SessionProvider, useSession } from "@/context/session-context";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { BrowserPanel } from "@/components/browser-panel";

function SessionPage() {
  const {
    sessionId,
    session,
    turns,
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
  } = useSession();
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [turns, assistanceRequest]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-11 px-4 border-b border-zinc-800 flex items-center justify-end">
          {isBusy && !isTerminal && (
            <button
              type="button"
              onClick={isPaused ? resumeTask : pauseTask}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
              title={isPaused ? "Resume agent" : "Pause agent"}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
        <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <ChatMessages turns={turns} isBusy={isBusy} />
          </div>
        </div>

        {isAwaitingAssistance && assistanceRequest && !isTerminal && (
          <div className="mx-4 mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <CircleHelp size={18} className="mt-0.5 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Agent needs your help</div>
                <p className="mt-1 whitespace-pre-wrap text-amber-100/80">{assistanceRequest}</p>
                <p className="mt-2 text-xs text-amber-100/60">
                  If needed, use the live browser on the right, then send your answer or confirmation below. The agent will continue automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={stopTask}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-300/20 px-2.5 text-xs text-amber-100 hover:bg-amber-400/10"
                title="Stop task"
              >
                <Square size={12} /> Stop
              </button>
            </div>
          </div>
        )}

        <ChatInput
          onSend={isAwaitingAssistance ? submitAssistance : sendMessage}
          isProcessing={isAwaitingAssistance ? isSubmittingAssistance : isBusy || isSending}
          onStop={stopTask}
          disabled={isTerminal}
          placeholder={
            isTerminal
              ? "Session has ended"
              : isAwaitingAssistance
                ? "Reply to the agent, or confirm after doing the required action…"
                : isPaused
                  ? "Agent is paused"
                  : "Send a follow-up…"
          }
        />
      </div>

      <div className="hidden lg:block w-[55%] shrink-0">
        <BrowserPanel sessionId={sessionId} liveUrl={session?.liveUrl} turns={turns} isSessionEnded={isTerminal} />
      </div>
    </div>
  );
}

export default function SessionPageWrapper() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const liveUrl = searchParams.get("liveUrl") ?? undefined;
  const [initialTask] = useState(() => {
    if (typeof window === "undefined") return undefined;
    const key = `task-${params.id}`;
    const task = sessionStorage.getItem(key) ?? undefined;
    if (task) sessionStorage.removeItem(key);
    return task;
  });

  return (
    <SessionProvider sessionId={params.id} initialLiveUrl={liveUrl} initialTask={initialTask}>
      <SessionPage />
    </SessionProvider>
  );
}
