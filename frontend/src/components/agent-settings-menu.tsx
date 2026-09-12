"use client";

import { useEffect, useRef, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import type { AgentSettings } from "@/lib/types";

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || value)}
        className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 text-xs text-zinc-300">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-5 w-9 rounded-full border p-0.5 transition-colors ${
          checked ? "border-emerald-500/60 bg-emerald-500/20" : "border-zinc-700 bg-zinc-800"
        }`}
      >
        <span
          className={`block h-3.5 w-3.5 rounded-full bg-zinc-200 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

export function AgentSettingsMenu() {
  const { agentSettings, setAgentSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AgentSettings>(agentSettings);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function show() {
    setDraft(agentSettings);
    setOpen(true);
  }

  function patch(next: Partial<AgentSettings>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        title="Agent settings"
        className="h-8 w-8 rounded-lg border border-transparent bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors flex items-center justify-center"
      >
        <SlidersHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-[350px] max-h-[560px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Agent settings</div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              Native Browser Use Agent controls. Changes apply to the next task.
            </p>
          </div>

          <div className="p-3 space-y-3 border-b border-zinc-800">
            <Toggle label="Use Vision" checked={draft.useVision} onChange={(value) => patch({ useVision: value })} />
            <Toggle label="Generate GIF" checked={draft.generateGif} onChange={(value) => patch({ generateGif: value })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Max Steps" value={draft.maxSteps} min={1} max={100} onChange={(value) => patch({ maxSteps: value })} />
              <NumberField label="Actions / Step" value={draft.maxActionsPerStep} min={1} max={20} onChange={(value) => patch({ maxActionsPerStep: value })} />
            </div>
          </div>

          <div className="p-3 space-y-3 border-b border-zinc-800">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Planning</div>
              <p className="mt-1 text-[11px] leading-4 text-zinc-600">
                Uses Browser Use 0.13.10 built-in planning. The old separate planner-LLM API is not copied.
              </p>
            </div>
            <Toggle label="Enable Planning" checked={draft.enablePlanning} onChange={(value) => patch({ enablePlanning: value })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Replan on Stall" value={draft.planningReplanOnStall} min={1} max={20} onChange={(value) => patch({ planningReplanOnStall: value })} />
              <NumberField label="Exploration Limit" value={draft.planningExplorationLimit} min={1} max={50} onChange={(value) => patch({ planningExplorationLimit: value })} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-3">
            <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 rounded-md text-xs text-zinc-400 hover:bg-zinc-800">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setAgentSettings(draft);
                setOpen(false);
              }}
              className="h-8 px-3 rounded-md text-xs text-zinc-100 bg-zinc-700 hover:bg-zinc-600 flex items-center gap-1.5"
            >
              <Check size={13} /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
