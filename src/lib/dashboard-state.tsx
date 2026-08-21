import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { CortiFact, CortiCode } from "@/lib/corti.functions";
import type { TimelineEvent } from "@/lib/patient-timeline";

type DashboardState = {
  text: string;
  setText: (value: string) => void;
  fileName: string | null;
  setFileName: (value: string | null) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  facts: CortiFact[] | null;
  setFacts: (value: CortiFact[] | null) => void;
  codes: CortiCode[] | null;
  setCodes: (value: CortiCode[] | null) => void;
  newEvents: TimelineEvent[];
  setNewEvents: (value: TimelineEvent[]) => void;
  fattyLiverRisk: boolean;
  setFattyLiverRisk: (value: boolean) => void;
  summary: string | null;
  setSummary: (value: string | null) => void;
};

const DashboardStateContext = createContext<DashboardState | null>(null);

/**
 * Holds the dashboard's working state above the router outlet so it survives
 * navigating to another page and back.
 */
export function DashboardStateProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facts, setFacts] = useState<CortiFact[] | null>(null);
  const [codes, setCodes] = useState<CortiCode[] | null>(null);
  const [newEvents, setNewEvents] = useState<TimelineEvent[]>([]);
  const [fattyLiverRisk, setFattyLiverRisk] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const value = useMemo<DashboardState>(
    () => ({
      text,
      setText,
      fileName,
      setFileName,
      error,
      setError,
      facts,
      setFacts,
      codes,
      setCodes,
      newEvents,
      setNewEvents,
      fattyLiverRisk,
      setFattyLiverRisk,
      summary,
      setSummary,
    }),
    [text, fileName, error, facts, codes, newEvents, fattyLiverRisk, summary],
  );

  return (
    <DashboardStateContext.Provider value={value}>{children}</DashboardStateContext.Provider>
  );
}

export function useDashboardState() {
  const ctx = useContext(DashboardStateContext);
  if (!ctx) {
    throw new Error("useDashboardState must be used inside DashboardStateProvider");
  }
  return ctx;
}
