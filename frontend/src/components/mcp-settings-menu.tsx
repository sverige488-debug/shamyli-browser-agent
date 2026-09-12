"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Plug, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import type { MCPServerSettings } from "@/lib/types";

const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function lines(value: string): string[] {
  return [...new Set(value.split("\n").map((item) => item.trim()).filter(Boolean))];
}

function actionNamespace(server: MCPServerSettings): string {
  const raw = (server.prefix.trim() || server.name.trim()).replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "server";
  const slug = raw.startsWith("mcp_") ? raw.slice(4) || "server" : raw;
  return `mcp_${slug}_`;
}

function LineListField({
  label,
  value,
  placeholder,
  hint,
  onChange,
}: {
  label: string;
  value: string[];
  placeholder: string;
  hint?: string;
  onChange: (value: string[]) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <textarea
        rows={3}
        value={value.join("\n")}
        onChange={(event) => onChange(lines(event.target.value))}
        placeholder={placeholder}
        className="min-h-[66px] resize-y rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 font-mono text-[11px] text-zinc-200 outline-none focus:border-zinc-500"
      />
      {hint && <span className="text-[10px] leading-4 text-zinc-600">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`h-5 w-9 rounded-full border p-0.5 transition-colors ${
        checked ? "border-emerald-500/60 bg-emerald-500/20" : "border-zinc-700 bg-zinc-800"
      }`}
    >
      <span className={`block h-3.5 w-3.5 rounded-full bg-zinc-200 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

export function MCPSettingsMenu() {
  const { agentSettings, setAgentSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MCPServerSettings[]>(agentSettings.mcpServers);
  const [expanded, setExpanded] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const validationError = useMemo(() => {
    if (draft.some((server) => !server.name.trim() || !server.command.trim())) {
      return "Every server needs a name and command.";
    }
    if (draft.some((server) => server.envKeys.some((key) => !ENV_KEY_RE.test(key)))) {
      return "Environment entries must be variable names, not values.";
    }
    const enabledNamespaces = draft.filter((server) => server.enabled).map(actionNamespace);
    if (enabledNamespaces.length !== new Set(enabledNamespaces).size) {
      return "Enabled MCP servers need unique names / namespaces.";
    }
    return null;
  }, [draft]);
  const enabledCount = agentSettings.mcpServers.filter((server) => server.enabled).length;

  function show() {
    setDraft(agentSettings.mcpServers.map((server) => ({ ...server, args: [...server.args], envKeys: [...server.envKeys], toolFilter: [...server.toolFilter] })));
    setExpanded(agentSettings.mcpServers.length ? 0 : null);
    setOpen(true);
  }

  function patch(index: number, next: Partial<MCPServerSettings>) {
    setDraft((current) => current.map((server, itemIndex) => itemIndex === index ? { ...server, ...next } : server));
  }

  function addServer() {
    if (draft.length >= 16) return;
    setDraft((current) => [
      ...current,
      {
        name: `MCP Server ${current.length + 1}`,
        command: "",
        args: [],
        envKeys: [],
        toolFilter: [],
        prefix: "",
        enabled: true,
      },
    ]);
    setExpanded(draft.length);
  }

  function removeServer(index: number) {
    setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setExpanded(null);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        title={`Native MCP · ${enabledCount} enabled`}
        className={`relative h-8 w-8 rounded-lg border border-transparent transition-colors flex items-center justify-center ${
          enabledCount ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20" : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
        }`}
      >
        <Plug size={16} />
        {enabledCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-sky-500 px-1 text-[9px] leading-4 text-white">
            {enabledCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-[430px] max-h-[720px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
              <Plug size={12} /> Native Browser Use MCP
            </div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              External stdio MCP servers are connected through Browser Use&apos;s native MCPClient. No legacy LangChain MCP bridge is used.
            </p>
          </div>

          <div className={`mx-3 mt-3 rounded-md border px-2.5 py-2 text-[10px] leading-4 ${
            agentSettings.interactionMode === "inspect"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200/90"
          }`}>
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={12} />
              {agentSettings.interactionMode === "inspect" ? "Inspect Only is active" : "Full Browser Control is active"}
            </div>
            <div className="mt-1 text-zinc-400">
              {agentSettings.interactionMode === "inspect"
                ? "All external MCP tools are skipped. Arbitrary MCP tools may have side effects, so SHAMYLI does not expose them in Inspect Only."
                : "Enabled MCP tools may execute actions defined by their external servers. Configure only servers you trust."}
            </div>
          </div>

          <div className="p-3 space-y-2">
            {draft.length === 0 && (
              <div className="rounded-md border border-dashed border-zinc-700 px-3 py-5 text-center text-[11px] leading-4 text-zinc-500">
                No MCP servers configured. Add one only when you need an external tool provider.
              </div>
            )}

            {draft.map((server, index) => {
              const isExpanded = expanded === index;
              return (
                <div key={`${server.name}-${index}`} className="rounded-lg border border-zinc-700 bg-zinc-950/60">
                  <div className="flex items-center gap-2 p-2">
                    <Toggle checked={server.enabled} onChange={(enabled) => patch(index, { enabled })} />
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : index)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-xs font-medium text-zinc-200">{server.name || "Unnamed MCP server"}</div>
                      <div className="truncate text-[10px] text-zinc-600">{server.command || "Command required"}</div>
                    </button>
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : index)} className="h-7 w-7 flex items-center justify-center text-zinc-500 hover:text-zinc-300">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button type="button" onClick={() => removeServer(index)} title="Remove server" className="h-7 w-7 flex items-center justify-center text-zinc-600 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-zinc-800 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                          Name
                          <input
                            value={server.name}
                            onChange={(event) => patch(index, { name: event.target.value })}
                            placeholder="filesystem"
                            className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                          Namespace (optional)
                          <input
                            value={server.prefix}
                            onChange={(event) => patch(index, { prefix: event.target.value })}
                            placeholder="filesystem"
                            className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-zinc-500"
                          />
                          <span className="text-[10px] leading-4 text-zinc-600">Actions are always isolated under {actionNamespace(server)} to protect native Browser Use action names.</span>
                        </label>
                      </div>

                      <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                        Command
                        <input
                          value={server.command}
                          onChange={(event) => patch(index, { command: event.target.value })}
                          placeholder="npx"
                          className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-zinc-500"
                        />
                      </label>

                      <LineListField
                        label="Arguments — one per line"
                        value={server.args}
                        onChange={(args) => patch(index, { args })}
                        placeholder={"-y\n@modelcontextprotocol/server-filesystem\nC:\\allowed-folder"}
                        hint="Do not place API keys or passwords in command arguments; use environment-variable names below."
                      />

                      <LineListField
                        label="Environment variable NAMES — one per line"
                        value={server.envKeys}
                        onChange={(envKeys) => patch(index, { envKeys })}
                        placeholder={"GITHUB_TOKEN\nSOME_SERVICE_API_KEY"}
                        hint="Names only. Secret values are resolved locally by the backend at runtime and are never stored in this UI or settings JSON."
                      />

                      <LineListField
                        label="Optional tool allow-list — one per line"
                        value={server.toolFilter}
                        onChange={(toolFilter) => patch(index, { toolFilter })}
                        placeholder={"read_file\nsearch"}
                        hint="Leave empty to register all tools exposed by this MCP server."
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addServer}
              disabled={draft.length >= 16}
              className="h-9 w-full rounded-md border border-dashed border-zinc-700 text-xs text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-300 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Plus size={13} /> Add MCP server
            </button>
          </div>

          <div className="border-t border-zinc-800 px-3 py-2 text-[10px] leading-4 text-zinc-600">
            Maximum 16 servers. MCP subprocesses are started only for the current Full Control task and disconnected when the run ends.
          </div>

          <div className="flex items-center justify-between gap-2 p-3 border-t border-zinc-800">
            <span className={`text-[10px] ${validationError ? "text-red-400" : "text-zinc-600"}`}>
              {validationError ?? `${draft.length} configured`}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 rounded-md text-xs text-zinc-400 hover:bg-zinc-800">
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(validationError)}
                onClick={() => {
                  setAgentSettings({ ...agentSettings, mcpServers: draft });
                  setOpen(false);
                }}
                className="h-8 px-3 rounded-md text-xs text-zinc-100 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 flex items-center gap-1.5"
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
