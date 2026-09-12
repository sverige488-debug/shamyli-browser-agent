"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { SessionProvider, useSession } from "@/context/session-context";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { BrowserPanel } from "@/components/browser-panel";

function SessionPage() {
  const { session, turns, isBusy, isTerminal, isSending, sendMessage, stopTask } = useSession();
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <ChatMessages turns={turns} isBusy={isBusy} />
          </div>
        </div>
        <ChatInput
          onSend={sendMessage}
          isProcessing={isBusy || isSending}
          onStop={stopTask}
          disabled={isTerminal}
          placeholder={isTerminal ? "Session has ended" : "Send a follow-up…"}
        />
      </div>

      <div className="hidden lg:block w-[55%] shrink-0">
        <BrowserPanel liveUrl={session?.liveUrl} turns={turns} isSessionEnded={isTerminal} />
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
