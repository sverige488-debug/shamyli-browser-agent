"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBrowserDefaults, listModelPresets } from "@/lib/actions";
import type { AgentSettings, BrowserSettings, ModelPreset } from "@/lib/types";

interface SettingsContextType {
  model: string;
  setModel: (m: string) => void;
  presets: ModelPreset[];
  browserSettings: BrowserSettings;
  setBrowserSettings: (settings: BrowserSettings) => void;
  agentSettings: AgentSettings;
  setAgentSettings: (settings: AgentSettings) => void;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);
const DEFAULT_MODEL = "openrouter::anthropic/claude-sonnet-4-6";
const BROWSER_SETTINGS_KEY = "shamyli-browser-settings";
const AGENT_SETTINGS_KEY = "shamyli-agent-settings";
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
  saveRecordingPath: "",
  tracePath: "",
  saveDownloadPath: "./tmp/downloads",
};
const FALLBACK_AGENT_SETTINGS: AgentSettings = {
  maxSteps: 25,
  maxActionsPerStep: 5,
  useVision: true,
};

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
    saveRecordingPath: raw?.saveRecordingPath ?? "",
    tracePath: raw?.tracePath ?? "",
    saveDownloadPath: raw?.saveDownloadPath ?? FALLBACK_BROWSER_SETTINGS.saveDownloadPath,
  };
}

function normalizeAgentSettings(raw?: Partial<AgentSettings> | null): AgentSettings {
  const maxSteps = Math.min(100, Math.max(1, Number(raw?.maxSteps) || FALLBACK_AGENT_SETTINGS.maxSteps));
  const maxActionsPerStep = Math.min(20, Math.max(1, Number(raw?.maxActionsPerStep) || FALLBACK_AGENT_SETTINGS.maxActionsPerStep));
  return {
    maxSteps,
    maxActionsPerStep,
    useVision: raw?.useVision ?? FALLBACK_AGENT_SETTINGS.useVision,
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
      value={{ model, setModel, presets, browserSettings, setBrowserSettings, agentSettings, setAgentSettings, isLoadingSettings }}
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
