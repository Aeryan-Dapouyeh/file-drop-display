import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { createDictationSession } from "@/lib/corti.functions";

const TARGET_RATE = 16000;

function downsampleToPcm16(input: Float32Array, inputRate: number): ArrayBuffer {
  const ratio = inputRate / TARGET_RATE;
  const length = Math.floor(input.length / ratio);
  const buffer = new ArrayBuffer(length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < length; i += 1) {
    const sample = input[Math.floor(i * ratio)] ?? 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return buffer;
}

type Status = "idle" | "connecting" | "recording" | "stopping";

/**
 * Live dictation through Corti's audio bridge: streams microphone PCM over a
 * websocket and reports interim + final transcript text as it arrives.
 */
export function useDictation({
  onTranscript,
}: {
  // Receives the full transcript so far (final segments + current interim).
  onTranscript: (text: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const startSession = useServerFn(createDictationSession);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const finalsRef = useRef<string[]>([]);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const teardown = useCallback(() => {
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void ctxRef.current?.close().catch(() => undefined);
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      teardown();
      wsRef.current?.close();
    };
  }, [teardown]);

  const stop = useCallback(() => {
    setStatus("stopping");
    teardown();
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "end" }));
      // Give Corti a moment to flush remaining final segments.
      setTimeout(() => {
        ws.close();
        wsRef.current = null;
        setStatus("idle");
      }, 2000);
    } else {
      ws?.close();
      wsRef.current = null;
      setStatus("idle");
    }
  }, [teardown]);

  const start = useCallback(async () => {
    if (status !== "idle") return;
    setError(null);
    setStatus("connecting");
    finalsRef.current = [];

    try {
      const session = await startSession({ data: undefined });
      if (!session.url) throw new Error(session.error ?? "Could not start dictation.");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;

      const ws = new WebSocket(session.url);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve(), { once: true });
        ws.addEventListener("error", () => reject(new Error("Dictation connection failed.")), {
          once: true,
        });
      });

      ws.send(
        JSON.stringify({
          type: "config",
          configuration: {
            primaryLanguage: "en",
            interimResults: true,
            spokenPunctuation: true,
            automaticPunctuation: false,
            audioFormat:
              "audio/pcm; rate=16000; channels=1; bits=16; endian=little; encoding=sint",
            formatting: { numbers: "numerals_above_nine", measurements: "abbreviated" },
          },
        }),
      );

      ws.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let message: { type?: string; data?: { text?: string; isFinal?: boolean } };
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === "CONFIG_ACCEPTED") {
          setStatus("recording");
          return;
        }
        if (
          message.type === "CONFIG_DENIED" ||
          message.type === "CONFIG_TIMEOUT" ||
          message.type === "error"
        ) {
          setError("Corti rejected the dictation session.");
          stop();
          return;
        }
        if (message.type === "transcript" && message.data) {
          const text = message.data.text ?? "";
          if (message.data.isFinal) {
            if (text) finalsRef.current = [...finalsRef.current, text];
            onTranscriptRef.current(finalsRef.current.join(" "));
          } else {
            onTranscriptRef.current([...finalsRef.current, text].join(" "));
          }
        }
        if (message.type === "ended") {
          stop();
        }
      });

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      node.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(downsampleToPcm16(event.inputBuffer.getChannelData(0), ctx.sampleRate));
      };
      source.connect(node);
      node.connect(ctx.destination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Microphone access is needed to record dictation.",
      );
      teardown();
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("idle");
    }
  }, [status, startSession, stop, teardown]);

  return {
    status,
    error,
    isRecording: status === "recording" || status === "connecting",
    start,
    stop,
    toggle: () => (status === "idle" ? void start() : stop()),
  };
}
