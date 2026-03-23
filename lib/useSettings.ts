// lib/useSettings.ts
"use client";

import { useState, useEffect } from "react";

export type GermanLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type CorrectionStrictness = "none" | "major" | "all";

export interface UserSettings {
  userName: string;
  level: GermanLevel;
  correction: CorrectionStrictness;
}

const SETTINGS_KEY = "german_user_settings";

const DEFAULT_SETTINGS: UserSettings = {
  userName: "",
  level: "B1",
  correction: "major",
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  function save(updated: UserSettings) {
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  return { settings, save, loaded };
}