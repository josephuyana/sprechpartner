"use client";

// components/SettingsDrawer.tsx

import { useState } from "react";
import { UserSettings, GermanLevel, CorrectionStrictness } from "@/lib/useSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (s: UserSettings) => void;
}

const LEVELS: GermanLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const CORRECTION_OPTIONS: { value: CorrectionStrictness; label: string; description: string }[] = [
  { value: "none", label: "None", description: "Never interrupt — full immersion" },
  { value: "major", label: "Major only", description: "Only errors that cause misunderstanding" },
  { value: "all", label: "All errors", description: "Correct grammar, vocab, and phrasing" },
];

export default function SettingsDrawer({ open, onClose, settings, onSave }: Props) {
  const [draft, setDraft] = useState<UserSettings>(settings);

  // Sync draft when drawer opens with latest settings
  function handleOpen() {
    setDraft(settings);
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "var(--color-background-primary, #fff)",
          borderTop: "0.5px solid var(--color-border-tertiary, #e4e4e7)",
          borderRadius: "16px 16px 0 0",
          padding: "1.5rem 1.5rem 2rem",
          maxWidth: "480px",
          margin: "0 auto",
          fontFamily: "var(--font-sans, system-ui, sans-serif)",
        }}
      >
        {/* Handle */}
        <div style={{
          width: "36px",
          height: "4px",
          borderRadius: "2px",
          background: "var(--color-border-secondary, #d4d4d8)",
          margin: "0 auto 1.5rem",
        }} />

        <h2 style={{
          fontSize: "16px",
          fontWeight: 500,
          color: "var(--color-text-primary, #18181b)",
          margin: "0 0 1.5rem",
        }}>
          Settings
        </h2>

        {/* Name */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--color-text-secondary, #71717a)",
            marginBottom: "6px",
            letterSpacing: "0.04em",
          }}>
            Your name
          </label>
          <input
            type="text"
            value={draft.userName}
            onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
            placeholder="e.g. Joseph"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: "14px",
              border: "0.5px solid var(--color-border-secondary, #d4d4d8)",
              borderRadius: "8px",
              background: "var(--color-background-primary, #fff)",
              color: "var(--color-text-primary, #18181b)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Level */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--color-text-secondary, #71717a)",
            marginBottom: "8px",
            letterSpacing: "0.04em",
          }}>
            German level
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDraft({ ...draft, level: lvl })}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  borderRadius: "8px",
                  border: draft.level === lvl
                    ? "1.5px solid var(--color-text-primary, #18181b)"
                    : "0.5px solid var(--color-border-tertiary, #e4e4e7)",
                  background: draft.level === lvl
                    ? "var(--color-text-primary, #18181b)"
                    : "transparent",
                  color: draft.level === lvl
                    ? "var(--color-background-primary, #fff)"
                    : "var(--color-text-secondary, #71717a)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Correction strictness */}
        <div style={{ marginBottom: "1.75rem" }}>
          <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--color-text-secondary, #71717a)",
            marginBottom: "8px",
            letterSpacing: "0.04em",
          }}>
            Error correction
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {CORRECTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDraft({ ...draft, correction: opt.value })}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: draft.correction === opt.value
                    ? "1.5px solid var(--color-text-primary, #18181b)"
                    : "0.5px solid var(--color-border-tertiary, #e4e4e7)",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border 0.15s",
                }}
              >
                <div>
                  <p style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text-primary, #18181b)",
                    margin: 0,
                  }}>{opt.label}</p>
                  <p style={{
                    fontSize: "12px",
                    color: "var(--color-text-secondary, #71717a)",
                    margin: "2px 0 0",
                  }}>{opt.description}</p>
                </div>
                <div style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  border: draft.correction === opt.value
                    ? "5px solid var(--color-text-primary, #18181b)"
                    : "1.5px solid var(--color-border-secondary, #d4d4d8)",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!draft.userName.trim()}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "14px",
            fontWeight: 500,
            borderRadius: "8px",
            border: "0.5px solid var(--color-border-secondary, #d4d4d8)",
            background: "var(--color-text-primary, #18181b)",
            color: "var(--color-background-primary, #fff)",
            cursor: draft.userName.trim() ? "pointer" : "not-allowed",
            opacity: draft.userName.trim() ? 1 : 0.4,
            transition: "opacity 0.15s",
          }}
        >
          Save
        </button>
      </div>
    </>
  );
}