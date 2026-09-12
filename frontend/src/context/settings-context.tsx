"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { listModelPresets } from "@/lib/actions";
import type { ModelPreset } from "@/lib/types";

interface SettingsContextType {
  model: string;
  setModel: (m: string) => void;
  presets: ModelPreset[];
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);
const DEFAULT_MODEL = "openrouter::anthropic/claude-sonnet-4-6";

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
  const { data, isLoading } = useQuery({ queryKey: ["local-model-presets"], queryFn: listModelPresets, staleTime: 60_000 });
  const presets = data?.length ? data : [{ value: DEFAULT_MODEL, label: "OpenRouter · Claude Sonnet 4.6" }];
  return <SettingsContext.Provider value={{ model, setModel, presets, isLoadingSettings: isLoading }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
