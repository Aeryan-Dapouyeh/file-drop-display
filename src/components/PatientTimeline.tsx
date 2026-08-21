import { useEffect, useMemo, useRef, useState } from "react";

import type { TimelineEvent } from "@/lib/patient-timeline";

const SOURCE_LABELS: Record<string, string> = {
  Vitals: "Vital sign",
  Bloodtests: "Blood test",
  Flowsheet: "Flowsheet",
  MedicationAdministrations: "Medication given",
  Prescriptions: "Prescription",
  Diagnosis: "Diagnosis",
};

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PatientTimeline({ events }: { events: TimelineEvent[] }) {
  const [active, setActive] = useState<{ index: number; x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const pinnedRef = useRef(pinned);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);


  // Keep a ref in sync so mouse-leave handlers always read the latest value.
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  // Group events that share a timestamp into a single dot on the line.
  const points = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const event of events) {
      const list = map.get(event.eventTime);
      if (list) list.push(event);
      else map.set(event.eventTime, [event]);
    }
    return [...map.entries()].map(([time, items]) => ({ time, items }));
  }, [events]);

  useEffect(() => {
    if (pinned === null) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const tooltip = tooltipRef.current;
      if (!tooltip || !tooltip.contains(target)) {
        setPinned(null);
        setActive(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pinned]);

  if (points.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border">
        <p className="text-sm text-muted-foreground">No timeline events available.</p>
      </div>
    );
  }


  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-h-[200px] min-w-full pt-6" style={{ width: points.length * 76 }}>
        {/* the line */}
        <div className="absolute left-0 right-0 top-[86px] h-px bg-foreground/25" />

        <div className="relative flex">
          {points.map((point, index) => {
            const isActive = active?.index === index;
            const isPinned = pinned === index;
            const isNew = point.items.some((item) => item.isNew);
            const isNewDay =
              index === 0 || point.time.slice(0, 10) !== points[index - 1]!.time.slice(0, 10);

            return (
              <div
                key={point.time}
                className="relative flex w-[76px] shrink-0 flex-col items-center"
                onMouseLeave={() => {
                  if (pinnedRef.current === null) {
                    setActive((cur) => (cur?.index === index ? null : cur));
                  }
                }}
              >
                {isNewDay && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {formatDay(point.time)}
                  </span>
                )}

                <div className="flex h-[60px] items-end justify-center">
                  <span className="mb-2 -rotate-45 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                    {formatTime(point.time).split(", ")[1]}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label={`${formatTime(point.time)} — ${point.items.length} event(s)`}
                  aria-pressed={isPinned}
                  onMouseEnter={(e) => {
                    if (pinned === null) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setActive({ index, x: rect.left + rect.width / 2, y: rect.bottom + 10 });
                    }
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (isPinned) {
                      setPinned(null);
                      setActive(null);
                    } else {
                      setPinned(index);
                      setActive({ index, x: rect.left + rect.width / 2, y: rect.bottom + 10 });
                    }
                  }}
                  className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                    isNew ? "border-timeline-new" : "border-foreground"
                  } ${
                    isActive
                      ? `scale-125 ${isNew ? "bg-timeline-new" : "bg-foreground"}`
                      : isNew
                        ? "bg-timeline-new"
                        : "bg-background"
                  }`}
                >
                  {point.items.length > 1 && (
                    <span
                      className={`text-[8px] font-bold ${isActive || isNew ? "text-background" : "text-foreground"}`}
                    >
                      {point.items.length}
                    </span>
                  )}
                </button>

                {isActive && active && (
                  <div
                    ref={(el) => {
                      tooltipRef.current = el;
                    }}
                    className="fixed z-50 max-h-[260px] w-64 -translate-x-1/2 overflow-y-auto rounded-md border border-foreground bg-background p-3 shadow-lg"
                    style={{ left: active.x, top: active.y }}
                  >
                    <p className="mb-2 font-mono text-[11px] font-semibold text-foreground">
                      {formatTime(point.time)}
                      {isPinned && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                          pinned
                        </span>
                      )}
                    </p>
                    <ul className="space-y-2">
                      {point.items.map((item, i) => (
                        <li key={`${item.sourceTable}-${item.eventType}-${i}`} className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {SOURCE_LABELS[item.sourceTable] ?? item.sourceTable}
                            {item.isNew ? (
                              <span className="ml-1 font-semibold text-timeline-new">new</span>
                            ) : null}
                          </p>
                          <p className="text-xs font-medium leading-snug text-foreground">
                            {item.eventType}
                            {item.value ? (
                              <span className="ml-1 font-mono font-normal text-muted-foreground">
                                {item.value}
                                {item.unit ? ` ${item.unit}` : ""}
                              </span>
                            ) : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


