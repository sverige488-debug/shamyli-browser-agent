"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/chat-input";
import { SettingsBar } from "@/components/model-selector";
import { useSettings } from "@/context/settings-context";
import { createSession } from "@/lib/actions";

const SUGGESTIONS = [
  "Open shamyli.com and inspect the homepage in read-only mode",
  "Open a website and summarize the main content",
  "Search the web and compare three sources",
  "Open WordPress staging and inspect the current page without saving",
];

export default function HomePage() {
  const router = useRouter();
  const { model } = useSettings();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(message: string) {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      const session = await createSession({ model });
      sessionStorage.setItem(`task-${session.id}`, message);
      const liveUrl = session.liveUrl ? encodeURIComponent(session.liveUrl) : "";
      router.push(`/session/${session.id}?liveUrl=${liveUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-100">What should the agent do?</h1>
          <p className="text-sm text-zinc-500">Local Browser Use agent · runs on this computer</p>
        </div>

        <div className="w-full">
          <ChatInput
            onSend={handleSend}
            disabled={isCreating}
            placeholder="Describe a task…"
            footer={<SettingsBar />}
          />
          {isCreating && <p className="text-sm text-zinc-500 text-center mt-2">Starting local session…</p>}
          {error && <p className="text-sm text-red-400 text-center mt-2 max-w-lg mx-auto break-all">{error}</p>}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              disabled={isCreating}
              className="px-3 py-1.5 text-[13px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
