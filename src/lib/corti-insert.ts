// Port of insert_corti_data_into_tables() from the Python backend:
// maps Corti facts / medical codes onto the same table shapes used by the
// patient timeline and returns them as new timeline events.
import type { TimelineEvent } from "@/lib/patient-timeline";
import type { CortiCode, CortiFact } from "@/lib/corti.functions";

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

const LAB_NAMES: Array<[string, string]> = [
  ["white blood cell count", "White Blood Cell Count"],
  ["hemoglobin", "Hemoglobin"],
  ["platelet count", "Platelet count"],
  ["sodium", "Sodium"],
  ["potassium", "Potassium"],
  ["creatinine", "Creatinine"],
  ["glucose", "Glucose"],
  ["c-reactive protein", "C-reactive protein"],
];

const VITAL_PATTERNS: Array<[RegExp, string, (m: RegExpMatchArray) => string]> = [
  [/temperature\s+(-?\d+(?:\.\d+)?)\s*([CF])/i, "Temperature", (m) => (m[2] ?? "").toUpperCase()],
  [/heart rate\s+(\d+(?:\.\d+)?)/i, "Pulse", () => "bpm"],
  [/respiratory rate\s+(\d+(?:\.\d+)?)/i, "Respiratory rate", () => "breaths/min"],
  [/oxygen saturation\s+(\d+(?:\.\d+)?)/i, "SpO2", () => "%"],
];

const PLAN_MEDICATIONS: Array<[RegExp, string]> = [
  [/\boxygen\b/i, "Oxygen"],
  [/\bceftriaxone\b/i, "Ceftriaxone"],
  [/\bazithromycin\b/i, "Azithromycin"],
];

/**
 * Builds the timeline events that insert_corti_data_into_tables() would have
 * appended to Vitals / Bloodtests / Prescriptions / MedicationAdministrations /
 * Diagnosis for the given encounter.
 */
export function buildEventsFromExtraction(
  facts: CortiFact[],
  codes: CortiCode[],
  encounterKey: string,
): TimelineEvent[] {
  const eventTime = nowLocalIso();
  const events: TimelineEvent[] = [];

  const push = (sourceTable: string, eventType: string, value: string, unit = "") => {
    events.push({ encounterKey, eventTime, sourceTable, eventType, value, unit, isNew: true });
  };

  for (const fact of facts) {
    const group = (fact.group ?? "").trim().toLowerCase();
    const text = fact.text.trim().replace(/\.$/, "");

    if (group === "vital-signs") {
      const bp = text.match(/blood pressure\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i);
      if (bp) {
        push("Vitals", "Systolic blood pressure", bp[1] ?? "", "mmHg");
        push("Vitals", "Diastolic blood pressure", bp[2] ?? "", "mmHg");
        continue;
      }
      for (const [pattern, name, unitFn] of VITAL_PATTERNS) {
        const m = text.match(pattern);
        if (m) {
          push("Vitals", name, m[1] ?? "", unitFn(m));
          break;
        }
      }
      continue;
    }

    if (group === "laboratory-results") {
      const lower = text.toLowerCase();
      for (const [prefix, component] of LAB_NAMES) {
        if (!lower.startsWith(prefix)) continue;
        const remaining = text.slice(prefix.length).trim();
        // Skip qualitative statements with no numeric result.
        const m = remaining.match(/^(-?\d+(?:\.\d+)?)\s+(.+)$/);
        if (m) push("Bloodtests", component, m[1] ?? "", m[2] ?? "");
        break;
      }
      continue;
    }

    if (group === "medications-prior-to-visit") {
      const dosed = text.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|ml|mL|units?)\s+(.+)$/i);
      if (dosed) {
        push("Prescriptions", dosed[1] ?? "", dosed[2] ?? "", dosed[3] ?? "");
        continue;
      }
      const plain = text.match(/^(.+?)\s+(daily|twice daily|once daily|nightly|as needed)/i);
      if (plain) push("Prescriptions", plain[1] ?? "", "", "");
      continue;
    }

    if (group === "plan") {
      for (const [pattern, name] of PLAN_MEDICATIONS) {
        if (pattern.test(text)) push("MedicationAdministrations", name, "", "");
      }
    }
  }

  for (const code of codes) {
    push("Diagnosis", code.display || code.code, code.code, "");
  }

  return events;
}
