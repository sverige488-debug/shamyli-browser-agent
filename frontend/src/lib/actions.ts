"use server";

import type { BrowserSettings, ModelPreset } from "./types";

const API = process.env.LOCAL_AGENT_API ?? "http://127.0.0.1:8000";

async function checked(res: Response) {
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function createSession(opts: { model: string; browserSettings: BrowserSettings }) {
  const res = await checked(await fetch(`${API}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: opts.model, browserSettings: opts.browserSettings }),
    cache: "no-store",
  }));
  return res.json() as Promise<{ id: string; liveUrl?: string | null; status: string }>;
}

export async function pauseTask(id: string) {
  await checked(await fetch(`${API}/sessions/${id}/pause`, { method: "POST", cache: "no-store" }));
}

export async function resumeTask(id: string) {
  await checked(await fetch(`${API}/sessions/${id}/resume`, { method: "POST", cache: "no-store" }));
}

export async function stopTask(id: string) {
  await checked(await fetch(`${API}/sessions/${id}/stop`, { method: "POST", cache: "no-store" }));
}

export async function submitAssistance(id: string, response: string) {
  await checked(await fetch(`${API}/sessions/${id}/assistance-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response }),
    cache: "no-store",
  }));
}

export async function listModelPresets(): Promise<ModelPreset[]> {
  try {
    const res = await checked(await fetch(`${API}/models`, { cache: "no-store" }));
    const data = await res.json();
    return data.presets ?? [];
  } catch {
    return [];
  }
}

export async function getBrowserDefaults(): Promise<BrowserSettings | null> {
  try {
    const res = await checked(await fetch(`${API}/browser-settings/defaults`, { cache: "no-store" }));
    return await res.json() as BrowserSettings;
  } catch {
    return null;
  }
}
