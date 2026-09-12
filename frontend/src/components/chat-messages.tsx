"use client";

import type { ConversationTurn } from "@/lib/types";
import { Markdown } from "./markdown";
import { StepSection } from "./step-section";
import { ThinkingIndicator } from "./thinking-indicator";

export function ChatMessages({ turns, isBusy }: { turns: ConversationTurn[]; isBusy: boolean }) {
  return (
    <div className="space-y-8">
      {turns.map((turn) => (
        <div key={turn.id} className="space-y-4">
          <div className="flex justify-end">
            <div className="bg-zinc-800 rounded-2xl px-4 py-2.5 max-w-[480px] text-[15px] text-zinc-100 whitespace-pre-wrap">{turn.userMessage.content}</div>
          </div>
          {turn.steps.map((step) => <StepSection key={step.id} step={step} />)}
          {turn.finalContent && <div className="text-[15px] text-zinc-200 leading-relaxed"><Markdown>{turn.finalContent}</Markdown></div>}
          {!turn.isComplete && isBusy && turn.steps.length === 0 && <ThinkingIndicator label="Starting…" />}
        </div>
      ))}
      {isBusy && (turns.length === 0 || turns[turns.length - 1]?.isComplete) && <ThinkingIndicator label="Thinking…" />}
    </div>
  );
}
