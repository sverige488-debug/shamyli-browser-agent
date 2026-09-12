"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MonitorCog } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import type { BrowserSettings } from "@/lib/types";

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        type="number"
        min={240}
        max={7680}
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

export function BrowserSettingsMenu() {
  const { browserSettings, setBrowserSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BrowserSettings>(browserSettings);
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
    setDraft(browserSettings);
    setOpen(true);
  }

  function patch(next: Partial<BrowserSettings>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        title="Browser settings"
        className="h-8 w-8 rounded-lg border border-transparent bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors flex items-center justify-center"
      >
        <MonitorCog size={16} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-[360px] max-h-[520px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Browser settings</div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              Reused Browser Use Web UI behavior. Changes apply to new sessions.
            </p>
          </div>

          <div className="px-3 py-2 border-b border-zinc-800">
            <Toggle label="Use Own Browser" checked={draft.useOwnBrowser} onChange={(value) => patch({ useOwnBrowser: value })} />
            <Toggle label="Keep Browser Open" checked={draft.keepBrowserOpen} onChange={(value) => patch({ keepBrowserOpen: value })} />
            <Toggle label="Headless Mode" checked={draft.headless} onChange={(value) => patch({ headless: value })} />
            <Toggle label="Disable Security" checked={draft.disableSecurity} onChange={(value) => patch({ disableSecurity: value })} />
          </div>

          <div className="p-3 space-y-3 border-b border-zinc-800">
            <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
              Browser Binary Path
              <input
                value={draft.browserBinaryPath}
                onChange={(event) => patch({ browserBinaryPath: event.target.value })}
                placeholder="Leave empty to use Browser Use Chromium"
                className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
              Browser User Data Dir
              <input
                value={draft.browserUserDataDir}
                onChange={(event) => patch({ browserUserDataDir: event.target.value })}
                placeholder="Optional profile directory"
                className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
              CDP URL
              <input
                value={draft.cdpUrl}
                onChange={(event) => patch({ cdpUrl: event.target.value })}
                placeholder="e.g. http://127.0.0.1:9222"
                className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Window Width" value={draft.windowWidth} onChange={(value) => patch({ windowWidth: value })} />
              <NumberField label="Window Height" value={draft.windowHeight} onChange={(value) => patch({ windowHeight: value })} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 px-3 rounded-md text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setBrowserSettings(draft);
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
