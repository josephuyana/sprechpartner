// lib/scenario.ts

const RECENT_SCENARIOS_KEY = "german_recent_scenarios";
const MAX_RECENT = 10;

export interface Scenario {
  id: string;
  title: string;
  setting: string; // Description shown on the scene card
  role: string; // Instructions for the user
  initiator: "ai" | "user";
  openingLine: string;
  tags: string[];
}

// --- localStorage helpers ---

export function getRecentScenarioIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SCENARIOS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecentScenarioId(id: string): void {
  const recent = getRecentScenarioIds();
  const updated = [id, ...recent.filter((r) => r !== id)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SCENARIOS_KEY, JSON.stringify(updated));
}

// --- Scenario generation ---

export async function generateScenario(userName: string): Promise<Scenario> {
  const recentIds = getRecentScenarioIds();

  const response = await fetch("/api/scenario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recentIds, userName }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate scenario");
  }

  const scenario: Scenario = await response.json();

  // Persist so it won't repeat soon
  saveRecentScenarioId(scenario.id);

  return scenario;
}