"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBrowserDefaults, listModelPresets } from "@/lib/actions";
import type { BrowserSettings, ModelPreset } from "@/lib/types";

interface SettingsContextType {
  model: string;
  setModel: (m: string) => void;
  presets: ModelPreset[];
  browserSettings: BrowserSettings;
  setBrowserSettings: (settings: BrowserSettings) => void;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);
const DEFAULT_MODEL = "openrouter::anthropic/claude-sonnet-4-6";
const BROWSER_SETTINGS_KEY = "shamyli-browser-settings";
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

  const presets = modelData?.length ? modelData : [{ value: DEFAULT_MODEL, label: "OpenRouter · Claude Sonnet 4.6" }];
  const isLoadingSettings = isLoadingModels || isLoadingBrowserDefaults || !browserHydrated;

  return (
    <SettingsContext.Provider
      value={{ model, setModel, presets, browserSettings, setBrowserSettings, isLoadingSettings }}
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
