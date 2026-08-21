import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import cortiLogoAsset from "@/assets/corti-logo.png.asset.json";
import { parseCsv } from "@/lib/patient-timeline";
import bloodtestsCsv from "@/data/Bloodtests.csv?raw";
import diagnosisCsv from "@/data/Diagnosis.csv?raw";
import flowsheetCsv from "@/data/Flowsheet.csv?raw";
import vitalsCsv from "@/data/Vitals.csv?raw";
import prescriptionsCsv from "@/data/Prescriptions.csv?raw";
import medicationsCsv from "@/data/MedicationAdministrations.csv?raw";

export const Route = createFileRoute("/tables")({
  head: () => ({
    meta: [
      { title: "Patient Data Tables — Medical Note Processor" },
      {
        name: "description",
        content: "Browse the raw patient data tables: blood tests, diagnoses, flowsheet, vitals, prescriptions and medications.",
      },
      { property: "og:title", content: "Patient Data Tables" },
      {
        property: "og:description",
        content: "Browse the raw patient data tables behind the clinical dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TablesPage,
});

const TABLES = [
  { name: "Bloodtests", csv: bloodtestsCsv },
  { name: "Diagnosis", csv: diagnosisCsv },
  { name: "Flowsheet", csv: flowsheetCsv },
  { name: "Vitals", csv: vitalsCsv },
  { name: "Prescriptions", csv: prescriptionsCsv },
  { name: "Medications", csv: medicationsCsv },
] as const;

const MAX_ROWS = 500;

function TablesPage() {
  const [active, setActive] = useState<string>(TABLES[0].name);
  const [query, setQuery] = useState("");

  const table = TABLES.find((t) => t.name === active)!;

  const rows = useMemo(() => parseCsv(table.csv), [table]);
  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => (row[col] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, columns, query]);

  const visible = filtered.slice(0, MAX_ROWS);

  return (
    <div className="min-h-screen bg-secondary px-6 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Patient data tables</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Raw source data used to build the patient timeline.
            </p>
          </div>
          <img
            src={cortiLogoAsset.url}
            alt="Corti logo"
            className="h-8 w-auto"
          />
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {TABLES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                setActive(t.name);
                setQuery("");
              }}
              className={
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
                (t.name === active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent")
              }
            >
              {t.name}
            </button>
          ))}
        </div>

        <section className="rounded-lg border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {active}
              <span className="ml-2 font-normal normal-case text-muted-foreground">
                {filtered.length} rows
                {filtered.length > MAX_ROWS ? ` (showing first ${MAX_ROWS})` : ""}
              </span>
            </h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter rows…"
              aria-label={`Filter ${active} rows`}
              className="w-56 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-background">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, index) => (
                  <tr key={index} className="hover:bg-accent/60">
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="whitespace-nowrap border-b border-border/60 px-3 py-2"
                      >
                        {row[col] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(columns.length, 1)}
                      className="px-3 py-8 text-center text-sm text-muted-foreground"
                    >
                      No rows match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
