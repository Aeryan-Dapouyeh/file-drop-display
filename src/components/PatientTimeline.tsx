import { useMemo, useState } from "react";

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
  const [active, setActive] = useState<number | null>(null);

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
            const isActive = active === index;
            const isNewDay =
              index === 0 || point.time.slice(0, 10) !== points[index - 1]!.time.slice(0, 10);
            return (
              <div
                key={point.time}
                className="relative flex w-[76px] shrink-0 flex-col items-center"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive((cur) => (cur === index ? null : cur))}
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
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-foreground transition-all ${
                    isActive ? "scale-125 bg-foreground" : "bg-background"
                  }`}
                >
                  {point.items.length > 1 && (
                    <span
                      className={`text-[8px] font-bold ${isActive ? "text-background" : "text-foreground"}`}
                    >
                      {point.items.length}
                    </span>
                  )}
                </button>

                {isActive && (
                  <div className="absolute left-1/2 top-[104px] z-20 w-64 -translate-x-1/2 rounded-md border border-foreground bg-background p-3 shadow-lg">
                    <p className="mb-2 font-mono text-[11px] font-semibold text-foreground">
                      {formatTime(point.time)}
                    </p>
                    <ul className="space-y-2">
                      {point.items.map((item, i) => (
                        <li key={`${item.sourceTable}-${item.eventType}-${i}`} className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {SOURCE_LABELS[item.sourceTable] ?? item.sourceTable}
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
