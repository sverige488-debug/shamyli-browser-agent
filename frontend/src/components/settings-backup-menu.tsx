"use client";

import { useRef, useState } from "react";
import { Download, FileUp, Settings2 } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import type { AgentSettings, BrowserSettings, LLMSettings } from "@/lib/types";

interface ExportedSettings {
  version: 1;
  model: string;
  llmSettings: LLMSettings;
  browserSettings: BrowserSettings;
  agentSettings: AgentSettings;
}

export function SettingsBackupMenu() {
  const {
    model,
    setModel,
    llmSettings,
    setLLMSettings,
    browserSettings,
    setBrowserSettings,
    agentSettings,
    setAgentSettings,
  } = useSettings();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportSettings() {
    const payload: ExportedSettings = {
      version: 1,
      model,
      llmSettings,
      browserSettings,
      agentSettings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shamyli-agent-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Settings exported.");
  }

  async function importSettings(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<ExportedSettings>;
      if (parsed.version !== 1 || typeof parsed.model !== "string" || !parsed.model.includes("::")) {
        throw new Error("Unsupported SHAMYLI settings file.");
      }
      if (!parsed.llmSettings || !parsed.browserSettings || !parsed.agentSettings) {
        throw new Error("Settings file is incomplete.");
      }

      // Imported files are untrusted input. An MCP command is an executable
      // subprocess, so never let a JSON import silently arm it. Keep the config
      // for review but require the user to explicitly re-enable each MCP server.
      const importedMCP = Array.isArray(parsed.agentSettings.mcpServers)
        ? parsed.agentSettings.mcpServers.map((server) => ({ ...server, enabled: false }))
        : [];
      const importedAgentSettings: AgentSettings = {
        ...parsed.agentSettings,
        mcpServers: importedMCP,
      };

      setModel(parsed.model);
      setLLMSettings(parsed.llmSettings);
      setBrowserSettings(parsed.browserSettings);
      setAgentSettings(importedAgentSettings);
      setStatus(
        importedMCP.length
          ? `Settings imported. ${importedMCP.length} MCP server${importedMCP.length === 1 ? "" : "s"} kept disabled until you review and enable them.`
          : "Settings imported. New sessions will use them.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import settings.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="Import / export UI settings"
        className="h-8 w-8 rounded-lg border border-transparent bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors flex items-center justify-center"
      >
        <Settings2 size={16} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-[320px] rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50">
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Load / save settings</div>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              Saves model, browser, agent, and MCP configuration. API keys and MCP secret values are never included; MCP stores environment-variable names only. Imported MCP servers are always disabled until reviewed.
            </p>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={exportSettings}
              className="h-9 rounded-md border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-1.5"
            >
              <Download size={13} /> Save JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-9 rounded-md border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center justify-center gap-1.5"
            >
              <FileUp size={13} /> Load JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importSettings(file);
              }}
            />
          </div>
          {status && <div className="px-3 pb-3 text-[11px] text-zinc-500">{status}</div>}
        </div>
      )}
    </div>
  );
}
