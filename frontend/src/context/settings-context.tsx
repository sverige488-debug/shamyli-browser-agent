"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBrowserDefaults, listModelPresets } from "@/lib/actions";
import type { AgentSettings, BrowserSettings, LLMSettings, MCPServerSettings, ModelPreset } from "@/lib/types";

interface SettingsContextType {
  model: string;
  setModel: (m: string) => void;
  presets: ModelPreset[];
  llmSettings: LLMSettings;
  setLLMSettings: (settings: LLMSettings) => void;
  browserSettings: BrowserSettings;
  setBrowserSettings: (settings: BrowserSettings) => void;
  agentSettings: AgentSettings;
  setAgentSettings: (settings: AgentSettings) => void;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);
const DEFAULT_MODEL = "openrouter::anthropic/claude-sonnet-4-6";
const LLM_SETTINGS_KEY = "shamyli-llm-settings";
const BROWSER_SETTINGS_KEY = "shamyli-browser-settings";
const AGENT_SETTINGS_KEY = "shamyli-agent-settings";
const FALLBACK_LLM_SETTINGS: LLMSettings = {
  temperature: 0.6,
  baseUrl: "",
  ollamaNumCtx: 16000,
};
const FALLBACK_BROWSER_SETTINGS: BrowserSettings = {
  browserBinaryPath: "",
  browserUserDataDir: "",
  useOwnBrowser: false,
  keepBrowserOpen: true,
  headless: false,
  disableSecurity: false,
  cdpUrl: "",
  windowWidth: 1920,
  windowHeight: 1080,
  allowedDomains: [],
  prohibitedDomains: [],
  blockIpAddresses: false,
  saveRecordingPath: "",
  tracePath: "",
  saveDownloadPath: "./tmp/downloads",
  saveAgentHistoryPath: "./tmp/agent_history",
};
const FALLBACK_AGENT_SETTINGS: AgentSettings = {
  interactionMode: "inspect",
  maxSteps: 25,
  maxActionsPerStep: 5,
  useVision: true,
  generateGif: false,
  enablePlanning: true,
  planningReplanOnStall: 3,
  planningExplorationLimit: 5,
  overrideSystemPrompt: "",
  extendSystemPrompt: "",
  mcpServers: [],
};

function normalizeStringList(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const item = value.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= maxItems) break;
  }
  return result;
}

function normalizeLLMSettings(raw?: Partial<LLMSettings> | null): LLMSettings {
  const temperatureValue = Number(raw?.temperature);
  const temperature = Number.isFinite(temperatureValue)
    ? Math.min(2, Math.max(0, temperatureValue))
    : FALLBACK_LLM_SETTINGS.temperature;
  const ctxValue = Number(raw?.ollamaNumCtx);
  const ollamaNumCtx = Number.isFinite(ctxValue)
    ? Math.min(65536, Math.max(256, Math.round(ctxValue)))
    : FALLBACK_LLM_SETTINGS.ollamaNumCtx;
  return {
    temperature,
    baseUrl: raw?.baseUrl?.trim() ?? "",
    ollamaNumCtx,
  };
}

function normalizeBrowserSettings(raw?: Partial<BrowserSettings> | null): BrowserSettings {
  return {
    browserBinaryPath: raw?.browserBinaryPath ?? "",
    browserUserDataDir: raw?.browserUserDataDir ?? "",
    useOwnBrowser: raw?.useOwnBrowser ?? FALLBACK_BROWSER_SETTINGS.useOwnBrowser,
    keepBrowserOpen: raw?.keepBrowserOpen ?? FALLBACK_BROWSER_SETTINGS.keepBrowserOpen,
    headless: raw?.headless ?? FALLBACK_BROWSER_SETTINGS.headless,
    disableSecurity: raw?.disableSecurity ?? FALLBACK_BROWSER_SETTINGS.disableSecurity,
    cdpUrl: raw?.cdpUrl ?? "",
    windowWidth: raw?.windowWidth ?? FALLBACK_BROWSER_SETTINGS.windowWidth,
    windowHeight: raw?.windowHeight ?? FALLBACK_BROWSER_SETTINGS.windowHeight,
    allowedDomains: normalizeStringList(raw?.allowedDomains, 99),
    prohibitedDomains: normalizeStringList(raw?.prohibitedDomains, 99),
    blockIpAddresses: raw?.blockIpAddresses ?? FALLBACK_BROWSER_SETTINGS.blockIpAddresses,
    saveRecordingPath: raw?.saveRecordingPath ?? "",
    tracePath: raw?.tracePath ?? "",
    saveDownloadPath: raw?.saveDownloadPath ?? FALLBACK_BROWSER_SETTINGS.saveDownloadPath,
    saveAgentHistoryPath: raw?.saveAgentHistoryPath ?? FALLBACK_BROWSER_SETTINGS.saveAgentHistoryPath,
  };
}

function normalizeMCPServers(raw: unknown): MCPServerSettings[] {
  if (!Array.isArray(raw)) return [];
  const result: MCPServerSettings[] = [];
  for (const candidate of raw.slice(0, 16)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Partial<MCPServerSettings>;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 128) : "";
    const command = typeof item.command === "string" ? item.command.trim().slice(0, 2048) : "";
    if (!name || !command) continue;
    result.push({
      name,
      command,
      args: normalizeStringList(item.args, 64),
      envKeys: normalizeStringList(item.envKeys, 64),
      toolFilter: normalizeStringList(item.toolFilter, 256),
      prefix: typeof item.prefix === "string" ? item.prefix.trim().slice(0, 128) : "",
      enabled: item.enabled !== false,
    });
  }
  return result;
}

function normalizeAgentSettings(raw?: Partial<AgentSettings> | null): AgentSettings {
  const maxSteps = Math.min(100, Math.max(1, Number(raw?.maxSteps) || FALLBACK_AGENT_SETTINGS.maxSteps));
  const maxActionsPerStep = Math.min(20, Math.max(1, Number(raw?.maxActionsPerStep) || FALLBACK_AGENT_SETTINGS.maxActionsPerStep));
  const planningReplanOnStall = Math.min(20, Math.max(1, Number(raw?.planningReplanOnStall) || FALLBACK_AGENT_SETTINGS.planningReplanOnStall));
  const planningExplorationLimit = Math.min(50, Math.max(1, Number(raw?.planningExplorationLimit) || FALLBACK_AGENT_SETTINGS.planningExplorationLimit));
  return {
    interactionMode: raw?.interactionMode === "full" ? "full" : "inspect",
    maxSteps,
    maxActionsPerStep,
    useVision: raw?.useVision ?? FALLBACK_AGENT_SETTINGS.useVision,
    generateGif: raw?.generateGif ?? FALLBACK_AGENT_SETTINGS.generateGif,
    enablePlanning: raw?.enablePlanning ?? FALLBACK_AGENT_SETTINGS.enablePlanning,
    planningReplanOnStall,
    planningExplorationLimit,
    overrideSystemPrompt: raw?.overrideSystemPrompt ?? "",
    extendSystemPrompt: raw?.extendSystemPrompt ?? "",
    mcpServers: normalizeMCPServers(raw?.mcpServers),
  };
}

function usePersisted(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) setValue(saved);
  }, [key]);
  const set = useCallback((v: string) => {
    setValue(v);
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  }, [key]);
  return [value, set] as const;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = usePersisted("shamyli-local-model", DEFAULT_MODEL);
  const [llmSettings, setLLMSettingsState] = useState<LLMSettings>(FALLBACK_LLM_SETTINGS);
  const [browserSettings, setBrowserSettingsState] = useState<BrowserSettings>(FALLBACK_BROWSER_SETTINGS);
  const [browserHydrated, setBrowserHydrated] = useState(false);
  const [agentSettings, setAgentSettingsState] = useState<AgentSettings>(FALLBACK_AGENT_SETTINGS);

  const { data: modelData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["local-model-presets"],
    queryFn: listModelPresets,
    staleTime: 60_000,
  });
  const { data: browserDefaults, isLoading: isLoadingBrowserDefaults } = useQuery({
    queryKey: ["local-browser-defaults"],
    queryFn: getBrowserDefaults,
    staleTime: 60_000,
  });

  useEffect(() => {
    const saved = localStorage.getItem(LLM_SETTINGS_KEY);
    if (!saved) return;
    try {
      setLLMSettingsState(normalizeLLMSettings(JSON.parse(saved) as Partial<LLMSettings>));
    } catch {
      localStorage.removeItem(LLM_SETTINGS_KEY);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(AGENT_SETTINGS_KEY);
    if (!saved) return;
    try {
      setAgentSettingsState(normalizeAgentSettings(JSON.parse(saved) as Partial<AgentSettings>));
    } catch {
      localStorage.removeItem(AGENT_SETTINGS_KEY);
    }
  }, []);

  useEffect(() => {
    if (browserHydrated) return;
    const saved = localStorage.getItem(BROWSER_SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<BrowserSettings>;
        setBrowserSettingsState(normalizeBrowserSettings(parsed));
        setBrowserHydrated(true);
        return;
      } catch {
        localStorage.removeItem(BROWSER_SETTINGS_KEY);
      }
    }

    if (browserDefaults) {
      setBrowserSettingsState(normalizeBrowserSettings(browserDefaults));
      setBrowserHydrated(true);
      return;
    }

    if (!isLoadingBrowserDefaults) setBrowserHydrated(true);
  }, [browserDefaults, browserHydrated, isLoadingBrowserDefaults]);

  const setLLMSettings = useCallback((settings: LLMSettings) => {
    const normalized = normalizeLLMSettings(settings);
    setLLMSettingsState(normalized);
    localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(normalized));
  }, []);

  const setBrowserSettings = useCallback((settings: BrowserSettings) => {
    const normalized = normalizeBrowserSettings(settings);
    setBrowserSettingsState(normalized);
    localStorage.setItem(BROWSER_SETTINGS_KEY, JSON.stringify(normalized));
  }, []);

  const setAgentSettings = useCallback((settings: AgentSettings) => {
    const normalized = normalizeAgentSettings(settings);
    setAgentSettingsState(normalized);
    localStorage.setItem(AGENT_SETTINGS_KEY, JSON.stringify(normalized));
  }, []);

  const presets = modelData?.length ? modelData : [{ value: DEFAULT_MODEL, label: "OpenRouter · Claude Sonnet 4.6" }];
  const isLoadingSettings = isLoadingModels || isLoadingBrowserDefaults || !browserHydrated;

  return (
    <SettingsContext.Provider
      value={{
        model,
        setModel,
        presets,
        llmSettings,
        setLLMSettings,
        browserSettings,
        setBrowserSettings,
        agentSettings,
        setAgentSettings,
        isLoadingSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
