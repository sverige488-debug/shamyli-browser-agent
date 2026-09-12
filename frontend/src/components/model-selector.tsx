"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Cpu, Laptop } from "lucide-react";
import { BrowserSettingsMenu } from "@/components/browser-settings-menu";
import { useSettings } from "@/context/settings-context";

export function SettingsBar() {
  const { model, setModel, presets, isLoadingSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = presets.find((p) => p.value === model);

  return (
    <div className="flex items-center gap-1">
      <div className="inline-flex items-center gap-1.5 px-2 h-8 rounded-lg border border-zinc-700 text-[11px] text-green-400 bg-green-500/10" title="Runs on this computer">
        <Laptop size={13} /> Local
      </div>
      <BrowserSettingsMenu />
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} title={`Model: ${current?.label ?? model}`} className="h-8 w-8 rounded-lg border flex items-center justify-center bg-amber-500/10 text-amber-400 border-transparent hover:bg-amber-500/20 transition-colors">
          <Cpu size={16} />
        </button>
        {open && (
          <div className="absolute bottom-full mb-1 right-0 w-[290px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 flex flex-col max-h-[360px] overflow-y-auto">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">LLM provider / model</div>
            {isLoadingSettings && <div className="px-3 py-3 text-xs text-zinc-500">Loading settings…</div>}
            {presets.map((item) => (
              <button key={item.value} type="button" onClick={() => { setModel(item.value); setOpen(false); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 ${model === item.value ? "text-white font-medium" : "text-zinc-400"}`}>
                <Cpu size={12} />
                <span className="flex-1">{item.label}</span>
                {model === item.value && <Check size={12} className="text-zinc-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
