"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConversationTurn } from "@/lib/types";

interface BrowserPanelProps {
  sessionId: string;
  liveUrl: string | null | undefined;
  turns: ConversationTurn[];
  isSessionEnded: boolean;
}

const LOCAL_API = process.env.NEXT_PUBLIC_LOCAL_AGENT_API ?? "http://127.0.0.1:8000";
const LOCAL_NOVNC_URL = process.env.NEXT_PUBLIC_NOVNC_URL?.trim() || "";

function extractCurrentUrl(turns: ConversationTurn[]): string {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    for (let j = turn.steps.length - 1; j >= 0; j--) {
      const tcs = turn.steps[j].toolCalls;
      for (let k = tcs.length - 1; k >= 0; k--) {
        if (tcs[k].type === "browse" && tcs[k].displayValue) return tcs[k].displayValue;
      }
    }
  }
  return "";
}

export function BrowserPanel({ sessionId, liveUrl, turns, isSessionEnded }: BrowserPanelProps) {
  const currentUrl = useMemo(() => extractCurrentUrl(turns), [turns]);
  const effectiveLiveUrl = liveUrl || LOCAL_NOVNC_URL || null;
  const [frame, setFrame] = useState(0);
  const [hasLocalFrame, setHasLocalFrame] = useState(false);

  // Prefer the already-proven Browser Use Web UI noVNC path when configured.
  // Screenshot polling remains only as a native BrowserSession fallback.
  useEffect(() => {
    if (effectiveLiveUrl || isSessionEnded) return;
    const timer = window.setInterval(() => setFrame((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [effectiveLiveUrl, isSessionEnded]);

  const screenshotUrl = `${LOCAL_API}/sessions/${encodeURIComponent(sessionId)}/screenshot?t=${frame}`;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      <div className="h-11 border-b border-zinc-800 flex items-center px-4">
        <span className="text-[13px] font-medium text-zinc-300">Agent&apos;s Browser</span>
      </div>
      <div className="h-8 border-b border-zinc-800 flex items-center px-4 gap-2">
        <span className="text-[11px] text-zinc-500">{isSessionEnded ? "Session ended" : currentUrl || "Waiting…"}</span>
      </div>
      <div className="flex-1 bg-zinc-900 relative overflow-hidden">
        {effectiveLiveUrl ? (
          <iframe
            src={effectiveLiveUrl}
            title="SHAMYLI live browser"
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <>
            <img
              src={screenshotUrl}
              alt="Local Browser Use session"
              className={`w-full h-full object-contain ${hasLocalFrame ? "block" : "hidden"}`}
              onLoad={() => setHasLocalFrame(true)}
              onError={() => setHasLocalFrame(false)}
            />
            {!hasLocalFrame && (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-zinc-600 text-sm">
                {isSessionEnded ? "Session has ended" : "Waiting for local browser…"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
