"use client";

// components/SceneCard.tsx

import { Scenario } from "@/lib/scenario";

interface SceneCardProps {
  scenario: Scenario;
  onStart: () => void;
  isLoadingAudio: boolean;
}

export default function SceneCard({
  scenario,
  onStart,
  isLoadingAudio,
}: SceneCardProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      fontFamily: "var(--font-sans)",
    }}>

      {/* Card */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "2rem",
        maxWidth: "480px",
        width: "100%",
      }}>

        {/* Tags */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {scenario.tags.map((tag) => (
            <span key={tag} style={{
              fontSize: "12px",
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: "20px",
          fontWeight: 500,
          color: "var(--color-text-primary)",
          margin: "0 0 0.75rem",
        }}>
          {scenario.title}
        </h2>

        {/* Setting */}
        <p style={{
          fontSize: "15px",
          color: "var(--color-text-secondary)",
          lineHeight: "1.6",
          margin: "0 0 1.5rem",
        }}>
          {scenario.setting}
        </p>

        {/* Divider */}
        <div style={{
          borderTop: "0.5px solid var(--color-border-tertiary)",
          margin: "0 0 1.5rem",
        }} />

        {/* Role + opening line */}
        <div style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          padding: "1rem 1.25rem",
          marginBottom: "1.75rem",
        }}>
          <p style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 6px",
          }}>
            {scenario.initiator === "ai" ? "They speak first" : "You start"}
          </p>
          <p style={{
            fontSize: "15px",
            color: "var(--color-text-primary)",
            fontStyle: "italic",
            margin: 0,
            lineHeight: "1.5",
          }}>
            "{scenario.openingLine}"
          </p>
        </div>

        {/* Role description */}
        <p style={{
          fontSize: "13px",
          color: "var(--color-text-secondary)",
          margin: "0 0 1.75rem",
          lineHeight: "1.5",
        }}>
          {scenario.role}
        </p>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={isLoadingAudio}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "15px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            background: "transparent",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)",
            cursor: isLoadingAudio ? "not-allowed" : "pointer",
            opacity: isLoadingAudio ? 0.5 : 1,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-background-secondary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {isLoadingAudio ? "Preparing audio..." : "Start conversation"}
        </button>
      </div>
    </div>
  );
}