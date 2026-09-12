"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Cpu, Laptop } from "lucide-react";
import { AgentSettingsMenu } from "@/components/agent-settings-menu";
import { BrowserSettingsMenu } from "@/components/browser-settings-menu";
import { MCPSettingsMenu } from "@/components/mcp-settings-menu";
import { SettingsBackupMenu } from "@/components/settings-backup-menu";
import { useSettings } from "@/context/settings-context";
import type { LLMSettings } from "@/lib/types";

export function SettingsBar() {
  const { model, setModel, presets, llmSettings, setLLMSettings, isLoadingSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draftModel, setDraftModel] = useState(model);
  const [draftLLM, setDraftLLM] = useState<LLMSettings>(llmSettings);
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
  const draftProvider = draftModel.includes("::") ? draftModel.split("::", 1)[0].toLowerCase() : "";

  function show() {
    setDraftModel(model);
    setDraftLLM(llmSettings);
    setOpen(true);
  }

  function apply() {
    const normalizedModel = draftModel.trim();
    if (!normalizedModel.includes("::")) return;
    setModel(normalizedModel);
    setLLMSettings(draftLLM);
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-1">
      <div className="inline-flex items-center gap-1.5 px-2 h-8 rounded-lg border border-zinc-700 text-[11px] text-green-400 bg-green-500/10" title="Runs on this computer">
        <Laptop size={13} /> Local
      </div>
      <BrowserSettingsMenu />
      <AgentSettingsMenu />
      <MCPSettingsMenu />
      <SettingsBackupMenu />
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : show())}
          title={`Model: ${current?.label ?? model}`}
          className="h-8 w-8 rounded-lg border flex items-center justify-center bg-amber-500/10 text-amber-400 border-transparent hover:bg-amber-500/20 transition-colors"
        >
          <Cpu size={16} />
        </button>
        {open && (
          <div className="absolute bottom-full mb-1 right-0 w-[390px] max-h-[620px] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
            <div className="px-3 py-2 border-b border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">LLM provider / model</div>
              <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                Native Browser Use providers. API keys stay in your local .env and are never stored in this browser UI.
              </p>
            </div>

            <div className="border-b border-zinc-800 py-1">
              {isLoadingSettings && <div className="px-3 py-2 text-xs text-zinc-500">Loading settings…</div>}
              {presets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDraftModel(item.value)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2 ${draftModel === item.value ? "text-white font-medium" : "text-zinc-400"}`}
                >
                  <Cpu size={12} />
                  <span className="flex-1">{item.label}</span>
                  {draftModel === item.value && <Check size={12} className="text-zinc-400" />}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-3 border-b border-zinc-800">
              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Custom model spec
                <input
                  value={draftModel}
                  onChange={(event) => setDraftModel(event.target.value)}
                  placeholder="provider::model-name"
                  className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                />
                <span className="text-[10px] text-zinc-600">Providers: openrouter, groq, openai, anthropic, google, ollama</span>
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Temperature: {draftLLM.temperature.toFixed(1)}
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={draftLLM.temperature}
                  onChange={(event) => setDraftLLM((currentSettings) => ({ ...currentSettings, temperature: Number(event.target.value) }))}
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Base URL / Ollama Host
                <input
                  value={draftLLM.baseUrl}
                  onChange={(event) => setDraftLLM((currentSettings) => ({ ...currentSettings, baseUrl: event.target.value }))}
                  placeholder={draftProvider === "ollama" ? "Optional Ollama host" : "Optional provider API endpoint"}
                  className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                />
                {draftProvider === "google" && (
                  <span className="text-[10px] text-amber-500/80">Browser Use 0.13.10 has no generic Google base_url field, so this value is ignored for Google.</span>
                )}
              </label>

              {draftProvider === "ollama" && (
                <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                  Ollama Context Length
                  <input
                    type="number"
                    min={256}
                    max={65536}
                    step={1}
                    value={draftLLM.ollamaNumCtx}
                    onChange={(event) => setDraftLLM((currentSettings) => ({ ...currentSettings, ollamaNumCtx: Number(event.target.value) || 16000 }))}
                    className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                  />
                </label>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-3">
              <div className="text-[10px] text-zinc-600">Secrets: environment only</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 rounded-md text-xs text-zinc-400 hover:bg-zinc-800">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={!draftModel.includes("::")}
                  className="h-8 px-3 rounded-md text-xs text-zinc-100 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Check size={13} /> Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
