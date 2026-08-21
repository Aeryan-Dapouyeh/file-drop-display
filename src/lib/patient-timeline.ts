// Port of generate_patient_timeline() from the Python backend:
// combines vitals, blood tests, flowsheet, medications, prescriptions and
// diagnoses into a single chronologically sorted event timeline.
import vitalsCsv from "@/data/Vitals.csv?raw";
import bloodtestsCsv from "@/data/Bloodtests.csv?raw";
import flowsheetCsv from "@/data/Flowsheet.csv?raw";
import medicationsCsv from "@/data/MedicationAdministrations.csv?raw";
import prescriptionsCsv from "@/data/Prescriptions.csv?raw";
import diagnosisCsv from "@/data/Diagnosis.csv?raw";
import populationCsv from "@/data/Population.csv?raw";

export type TimelineEvent = {
  encounterKey: string;
  eventTime: string;
  sourceTable: string;
  eventType: string;
  value: string;
  unit: string;
  /** True for events created from a freshly processed journal note. */
  isNew?: boolean;
};


type Row = Record<string, string>;

export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const header = rows.shift();
  if (!header) return [];
  return rows.map((cells) => {
    const record: Row = {};
    header.forEach((key, index) => {
      record[key.trim()] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

const population = parseCsv(populationCsv);

function map(
  rows: Row[],
  sourceTable: string,
  time: string,
  type: string,
  value: string,
  unit?: string,
): TimelineEvent[] {
  return rows.map((r) => ({
    encounterKey: r["EncounterKey"] ?? "",
    eventTime: r[time] ?? "",
    sourceTable,
    eventType: r[type] ?? "",
    value: r[value] ?? "",
    unit: unit ? (r[unit] ?? "") : "",
  }));
}

function buildDiagnoses(rows: Row[]): TimelineEvent[] {
  return rows.map((r) => {
    const start = r["DiagnosisStartDate"] ?? "";
    let eventTime = start;
    const encounter = population.find(
      (p) => p["EncounterKey"] === r["EncounterKey"],
    );
    const startInstant = encounter?.["StartInstant"] ?? "";
    // If the diagnosis was made on the encounter start date, use the
    // encounter's actual start time instead of midnight.
    if (startInstant && start && startInstant.slice(0, 10) === start.slice(0, 10)) {
      eventTime = startInstant;
    }
    return {
      encounterKey: r["EncounterKey"] ?? "",
      eventTime,
      sourceTable: "Diagnosis",
      eventType: r["Name"] ?? "",
      value: r["SKSCode"] ?? "",
      unit: "",
    };
  });
}

export function generatePatientTimeline(encounterKey?: string): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...map(parseCsv(vitalsCsv), "Vitals", "TakenInstant", "MeasurementType", "NumericValue", "Unit"),
    ...map(parseCsv(bloodtestsCsv), "Bloodtests", "CollectionInstant", "ComponentName", "NumericValue", "Unit"),
    ...map(parseCsv(flowsheetCsv), "Flowsheet", "TakenInstant", "DisplayName", "NumericValue"),
    ...map(parseCsv(medicationsCsv), "MedicationAdministrations", "AdministrationInstant", "MedicationName", "Dose", "DoseUnit"),
    ...map(parseCsv(prescriptionsCsv), "Prescriptions", "PrescriptionStartInstant", "Drug", "Dose", "DoseUnit"),
    ...buildDiagnoses(parseCsv(diagnosisCsv)),
  ];

  return events
    .filter((e) => e.eventTime && !Number.isNaN(Date.parse(e.eventTime)))
    .filter((e) => (encounterKey ? e.encounterKey === encounterKey : true))
    .sort(
      (a, b) =>
        a.encounterKey.localeCompare(b.encounterKey) ||
        Date.parse(a.eventTime) - Date.parse(b.eventTime),
    );
}

export function getEncounter(encounterKey: string): Row | undefined {
  return population.find((p) => p["EncounterKey"] === encounterKey);
}
