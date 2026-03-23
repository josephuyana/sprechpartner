"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SceneCard from "@/components/SceneCard";
import SettingsDrawer from "@/components/SettingsDrawer";
import { generateScenario, Scenario } from "@/lib/scenario";
import { VocabStruggle } from "@/lib/systemPrompt";
import { useSettings } from "@/lib/useSettings";

const VOCAB_STRUGGLES_KEY = "german_vocab_struggles";

type Turn = { user: string; assistant: string };

function getVocabStruggles(): VocabStruggle[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(VOCAB_STRUGGLES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveVocabStruggles(struggles: VocabStruggle[]) {
  localStorage.setItem(VOCAB_STRUGGLES_KEY, JSON.stringify(struggles));
}

export default function Conversation() {
  const { settings, save: saveSettings, loaded: settingsLoaded } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadScenario = useCallback((userName: string) => {
    setIsLoadingScenario(true);
    setError(null);
    generateScenario(userName)
      .then(setScenario)
      .catch(() => setError("Failed to generate scenario. Please refresh."))
      .finally(() => setIsLoadingScenario(false));
  }, []);

  // Load scenario once settings are ready and name is set
  useEffect(() => {
    if (!settingsLoaded) return;
    if (!settings.userName.trim()) {
      // No name yet — open settings immediately so user can set it
      setSettingsOpen(true);
      return;
    }
    loadScenario(settings.userName);
  }, [settingsLoaded, settings.userName, loadScenario]);

  const playAudio = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const speechRes = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!speechRes.ok) {
      const errData = await speechRes.json();
      throw new Error(errData.error || "Speech failed");
    }
    const audioBlob = await speechRes.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
  }, []);

  const handleStart = useCallback(async () => {
    if (!scenario) return;
    setIsLoadingAudio(true);
    setError(null);

    try {
      if (scenario.initiator === "ai") {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "start",
            scenario,
            userName: settings.userName,
            level: settings.level,
            correction: settings.correction,
            vocabStruggles: getVocabStruggles(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start");

        const greeting = data.text || "";
        if (greeting.trim()) {
          setTurns([{ user: "", assistant: greeting }]);
          setConversationStarted(true);
          await playAudio(greeting);
        }
      } else {
        setConversationStarted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start conversation");
    } finally {
      setIsLoadingAudio(false);
    }
  }, [scenario, settings, playAudio]);

  const transcribeAndRespond = useCallback(
    async (blob: Blob) => {
      if (isEnded || !scenario) return;
      setIsTranscribing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const transcribeData = await transcribeRes.json();
        if (!transcribeRes.ok) throw new Error(transcribeData.error || "Transcription failed");

        const transcript = transcribeData.text || "";
        setIsTranscribing(false);
        if (!transcript.trim()) return;

        setIsResponding(true);

        const history = turns.flatMap((t) => {
          const msgs: { role: string; content: string }[] = [];
          if (t.user) msgs.push({ role: "user", content: t.user });
          if (t.assistant) msgs.push({ role: "assistant", content: t.assistant });
          return msgs;
        });

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            userMessage: transcript,
            messages: history,
            scenario,
            userName: settings.userName,
            level: settings.level,
            correction: settings.correction,
            vocabStruggles: getVocabStruggles(),
          }),
        });
        const chatData = await chatRes.json();
        if (!chatRes.ok) throw new Error(chatData.error || "Chat failed");

        const responseText = chatData.text || "";
        if (!responseText.trim()) { setIsResponding(false); return; }

        setTurns((prev) => [...prev, { user: transcript, assistant: responseText }]);
        setIsResponding(false);
        await playAudio(responseText);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsTranscribing(false);
        setIsResponding(false);
      }
    },
    [turns, isEnded, scenario, settings, playAudio]
  );

  const endConversation = useCallback(async () => {
    const conversation = turns.filter((t) => t.user || t.assistant);
    if (conversation.length === 0) return;
    setIsEnded(true);
    setIsGettingFeedback(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "feedback", conversation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feedback failed");

      const feedbackText = data.text || "";
      setFeedback(feedbackText);

      // Persist vocab struggles extracted from feedback
      const matches = [...feedbackText.matchAll(/"([^"]+)"\s*→\s*"([^"]+)"/g)];
      if (matches.length > 0) {
        const existing = getVocabStruggles();
        const updated = [...existing];
        for (const match of matches) {
          const word = match[1];
          const correction = match[2];
          const idx = updated.findIndex((v) => v.word === word);
          if (idx >= 0) updated[idx].seenCount += 1;
          else updated.push({ word, correction, seenCount: 1 });
        }
        saveVocabStruggles(updated.slice(-30));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get feedback");
    } finally {
      setIsGettingFeedback(false);
    }
  }, [turns]);

  const handleRestart = useCallback(() => {
    setScenario(null);
    setConversationStarted(false);
    setTurns([]);
    setFeedback(null);
    setIsEnded(false);
    setIsGettingFeedback(false);
    setError(null);
    loadScenario(settings.userName);
  }, [settings.userName, loadScenario]);

  const startRecording = async () => {
    if (isEnded) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        transcribeAndRespond(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const isLoading = isTranscribing || isResponding || isLoadingAudio;

  // --- Render: waiting for settings to load ---
  if (!settingsLoaded) return null;

  // --- Render: scene card or loading ---
  if (!conversationStarted) {
    return (
      <>
        {/* Settings icon */}
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 30,
            background: "transparent",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          ⚙ Settings
        </button>

        {isLoadingScenario || !scenario ? (
          <div className="min-h-screen flex items-center justify-center bg-zinc-100">
            <p className="text-sm text-zinc-500">
              {settings.userName ? "Preparing your scenario…" : "Set your name to get started"}
            </p>
          </div>
        ) : (
          <SceneCard scenario={scenario} onStart={handleStart} isLoadingAudio={isLoadingAudio} />
        )}

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => {
            setSettingsOpen(false);
            // If name was just set and no scenario yet, load one
            if (settings.userName.trim() && !scenario && !isLoadingScenario) {
              loadScenario(settings.userName);
            }
          }}
          settings={settings}
          onSave={(s) => {
            saveSettings(s);
            // If name changed, reload scenario
            if (s.userName !== settings.userName) {
              setScenario(null);
              loadScenario(s.userName);
            }
          }}
        />
      </>
    );
  }

  // --- Render: conversation ---
  return (
    <>
      {/* Settings icon */}
      <button
        onClick={() => setSettingsOpen(true)}
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 30,
          background: "transparent",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "12px",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        ⚙ Settings
      </button>

      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-zinc-100 px-4 py-8">
        {scenario && (
          <p className="text-xs text-zinc-400 font-medium">{scenario.title}</p>
        )}

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isEnded}
          className={`flex items-center justify-center w-16 h-16 rounded-full border border-zinc-300 bg-white transition-colors disabled:opacity-50 ${
            isRecording ? "border-red-400 bg-red-50" : "hover:bg-zinc-50 hover:border-zinc-400"
          }`}
          aria-label={isRecording ? "Stop recording" : "Record"}
        >
          <span className={`w-4 h-4 rounded-full bg-red-500 ${isRecording ? "animate-pulse" : ""}`} />
        </button>

        {!isEnded && (
          <button
            type="button"
            onClick={endConversation}
            disabled={isLoading}
            className="text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
          >
            End conversation
          </button>
        )}

        {isLoadingAudio && <p className="text-sm text-zinc-500">Preparing audio…</p>}
        {isRecording && <p className="text-sm text-zinc-500">Recording…</p>}
        {isTranscribing && <p className="text-sm text-zinc-500">Transcribing…</p>}
        {isResponding && <p className="text-sm text-zinc-500">Thinking…</p>}
        {isGettingFeedback && <p className="text-sm text-zinc-500">Generating feedback…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="w-full max-w-md flex flex-col gap-4 max-h-80 overflow-y-auto">
          {turns.map((turn, i) => (
            <div key={i} className="flex flex-col gap-2">
              {turn.user ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                  <p className="text-xs font-medium text-zinc-400 mb-1">You</p>
                  {turn.user}
                </div>
              ) : null}
              {turn.assistant ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p className="text-xs font-medium text-zinc-400 mb-1">{scenario?.title ?? "Teacher"}</p>
                  {turn.assistant}
                </div>
              ) : null}
            </div>
          ))}

          {feedback && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-zinc-700">
                <p className="text-xs font-medium text-amber-600 mb-1">Feedback – your errors</p>
                <div className="whitespace-pre-wrap">{feedback}</div>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="w-full rounded-lg border border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Start new conversation
              </button>
            </>
          )}
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
      />
    </>
  );
}