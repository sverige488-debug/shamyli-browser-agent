"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MonitorCog, ShieldCheck } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import type { BrowserSettings } from "@/lib/types";

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

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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

function parseDomainLines(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split("\n")) {
    const domain = raw.trim();
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    result.push(domain);
    if (result.length >= 99) break;
  }
  return result;
}

function DomainListField({
  label,
  value,
  placeholder,
  hint,
  onChange,
}: {
  label: string;
  value: string[];
  placeholder: string;
  hint: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <textarea
        rows={3}
        value={value.join("\n")}
        onChange={(event) => onChange(parseDomainLines(event.target.value))}
        placeholder={placeholder}
        className="min-h-[70px] resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
      />
      <span className="text-[10px] leading-4 text-zinc-600">{hint}</span>
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
    setDraft({
      ...browserSettings,
      allowedDomains: [...browserSettings.allowedDomains],
      prohibitedDomains: [...browserSettings.prohibitedDomains],
    });
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
        <div className="absolute bottom-full mb-1 right-0 w-[400px] max-h-[680px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Browser settings</div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              Reused Browser Use Web UI behavior and native BrowserProfile controls. Changes apply to new sessions.
            </p>
          </div>

          <div className="px-3 py-2 border-b border-zinc-800">
            <Toggle label="Use Own Browser" checked={draft.useOwnBrowser} onChange={(value) => patch({ useOwnBrowser: value })} />
            <Toggle label="Keep Browser Open" checked={draft.keepBrowserOpen} onChange={(value) => patch({ keepBrowserOpen: value })} />
            <Toggle label="Headless Mode" checked={draft.headless} onChange={(value) => patch({ headless: value })} />
            <Toggle label="Disable Security" checked={draft.disableSecurity} onChange={(value) => patch({ disableSecurity: value })} />
          </div>

          <div className="p-3 space-y-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                <ShieldCheck size={12} /> Native navigation scope
              </div>
              <p className="mt-1 text-[11px] leading-4 text-zinc-600">
                Browser Use enforces these rules on navigation. Leave Allowed Domains empty for unrestricted navigation.
              </p>
            </div>
            <DomainListField
              label="Allowed Domains — one per line"
              value={draft.allowedDomains}
              onChange={(allowedDomains) => patch({ allowedDomains })}
              placeholder={"shamyli.com\n*.shamyli.com"}
              hint="When this list is non-empty, navigation is limited to it. Native Browser Use supports patterns such as *.example.com."
            />
            <DomainListField
              label="Prohibited Domains — one per line"
              value={draft.prohibitedDomains}
              onChange={(prohibitedDomains) => patch({ prohibitedDomains })}
              placeholder={"example.com\n*.example.com"}
              hint="Allowed Domains take precedence if a domain appears in both native Browser Use policies."
            />
            <Toggle
              label="Block navigation to IP addresses"
              checked={draft.blockIpAddresses}
              onChange={(value) => patch({ blockIpAddresses: value })}
            />
            {draft.blockIpAddresses && (
              <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[10px] leading-4 text-amber-200/70">
                This also blocks localhost/private-network URLs by IP. Keep it off when the task must browse an IP-based local service.
              </p>
            )}
          </div>

          <div className="p-3 space-y-3 border-b border-zinc-800">
            <TextField
              label="Browser Binary Path"
              value={draft.browserBinaryPath}
              onChange={(value) => patch({ browserBinaryPath: value })}
              placeholder="Leave empty to use Browser Use Chromium"
            />
            <TextField
              label="Browser User Data Dir"
              value={draft.browserUserDataDir}
              onChange={(value) => patch({ browserUserDataDir: value })}
              placeholder="Optional profile directory"
            />
            <TextField
              label="CDP URL"
              value={draft.cdpUrl}
              onChange={(value) => patch({ cdpUrl: value })}
              placeholder="e.g. http://127.0.0.1:9222"
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Window Width" min={320} max={7680} value={draft.windowWidth} onChange={(value) => patch({ windowWidth: value })} />
              <NumberField label="Window Height" min={240} max={4320} value={draft.windowHeight} onChange={(value) => patch({ windowHeight: value })} />
            </div>
          </div>

          <div className="p-3 space-y-3 border-b border-zinc-800">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Browser output paths</div>
              <p className="mt-1 text-[11px] leading-4 text-zinc-600">Native Browser Use recording, trace, download, and agent-history directories.</p>
            </div>
            <TextField
              label="Recording Path"
              value={draft.saveRecordingPath}
              onChange={(value) => patch({ saveRecordingPath: value })}
              placeholder="Optional — e.g. ./tmp/record_videos"
            />
            <TextField
              label="Trace Path"
              value={draft.tracePath}
              onChange={(value) => patch({ tracePath: value })}
              placeholder="Optional — e.g. ./tmp/traces"
            />
            <TextField
              label="Download Path"
              value={draft.saveDownloadPath}
              onChange={(value) => patch({ saveDownloadPath: value })}
              placeholder="e.g. ./tmp/downloads"
            />
            <TextField
              label="Agent History Path"
              value={draft.saveAgentHistoryPath}
              onChange={(value) => patch({ saveAgentHistoryPath: value })}
              placeholder="e.g. ./tmp/agent_history"
            />
          </div>

          <div className="flex items-center justify-between gap-2 p-3">
            <span className="text-[10px] text-zinc-600">
              {draft.allowedDomains.length ? `${draft.allowedDomains.length} allowed domain rule${draft.allowedDomains.length === 1 ? "" : "s"}` : "Navigation unrestricted unless prohibited below"}
            </span>
            <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  );
}
