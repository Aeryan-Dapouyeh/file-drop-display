import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileText, Upload, X, AlertCircle, Loader2, Mic, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { extractFacts, type CortiFact, type CortiCode } from "@/lib/corti.functions";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Patient Overview | Medical Note Processor" },
      { name: "description", content: "Review patient details and timeline, then extract clinical facts and diagnosis codes from a journal note." },
      { property: "og:title", content: "Patient Overview | Medical Note Processor" },
      { property: "og:description", content: "Review patient details and timeline, then extract clinical facts and diagnosis codes from a journal note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PATIENT = {
  name: "John Doe",
  id: "PT-004821",
  age: "68 years",
  sex: "Male",
  weight: "82 kg",
  height: "175 cm",
};

function Panel({
  title,
  meta,
  children,
  className,
  contentClassName,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border bg-background ${className ?? ""}`}
    >
      <header className="flex items-baseline justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
          {title}
        </h2>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </header>
      <div className={`p-5 ${contentClassName ?? ""}`}>{children}</div>
    </section>
  );
}

function Index() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [facts, setFacts] = useState<CortiFact[] | null>(null);
  const [codes, setCodes] = useState<CortiCode[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const runExtractFacts = useServerFn(extractFacts);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      setError("Please upload a .txt file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(String(e.target?.result ?? ""));
    };
    reader.onerror = () => {
      setError("Could not read the file.");
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  const clear = useCallback(() => {
    setText("");
    setFileName(null);
    setError(null);
    setFacts(null);
    setCodes(null);
  }, []);

  const onProcess = useCallback(async () => {
    if (!text.trim() || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setFacts(null);
    setCodes(null);
    try {
      const result = await runExtractFacts({ data: { journal: text } });
      if (result.error) {
        setError(result.error);
      } else {
        setFacts(result.facts);
        setCodes(result.codes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fact extraction failed.");
    } finally {
      setIsProcessing(false);
    }
  }, [text, isProcessing, runExtractFacts]);

  return (
    <div className="min-h-screen bg-secondary px-6 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 1) Patient overview header */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
              <User className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Patient overview
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {PATIENT.name}
              </h1>
            </div>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{PATIENT.id}</p>
        </header>

        {/* 2) Demographics + timeline */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Patient details">
            <dl className="divide-y divide-border">
              {[
                ["Age", PATIENT.age],
                ["Sex", PATIENT.sex],
                ["Weight", PATIENT.weight],
                ["Height", PATIENT.height],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Patient timeline" className="lg:col-span-2">
            <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed border-border">
              <p className="max-w-sm px-6 text-center text-sm text-muted-foreground">
                The timeline is built from extracted events and patient data. Process a
                journal note to populate it.
              </p>
            </div>
          </Panel>
        </div>

        {/* 3) Input + results */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Journal input" meta={`${text.length} chars`}>
            <div className="space-y-4">
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`relative rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"
                }`}
              >
                <div className="pointer-events-none relative z-10 flex flex-col items-center gap-2">
                  <Upload className="h-5 w-5 text-foreground" />
                  <p className="text-sm font-medium text-foreground">Drop a .txt file</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={onFileInputChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Upload a .txt file"
                />
              </div>

              {fileName && (
                <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium text-foreground">{fileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded p-1 hover:bg-background"
                    aria-label="Clear file"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="note-text">Journal text</Label>
                <Textarea
                  id="note-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste text here, or drop a .txt file above..."
                  className="min-h-[200px] resize-y border-foreground/20 font-mono text-sm leading-relaxed focus-visible:border-foreground focus-visible:ring-foreground"
                />
              </div>

              <Button variant="outline" className="w-full" disabled>
                <Mic className="mr-2 h-4 w-4" />
                Record voice (coming soon)
              </Button>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={onProcess}
                  disabled={!text.trim() || isProcessing}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessing ? "Extracting..." : "Process note"}
                </Button>
                <Button
                  variant="outline"
                  onClick={clear}
                  disabled={(!text && !fileName) || isProcessing}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Panel>

          <div className="space-y-6 lg:col-span-2">
            <Panel
              title="Clinical facts"
              meta={facts ? `${facts.length} ${facts.length === 1 ? "fact" : "facts"}` : undefined}
              contentClassName="max-h-[320px] overflow-y-auto"
            >
              {!facts ? (
                <div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    Process a note to list the extracted clinical facts.
                  </p>
                </div>
              ) : facts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No facts were extracted from this note.
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {facts.map((fact, index) => (
                    <li key={fact.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm leading-relaxed text-foreground">{fact.text}</p>
                        {fact.group && (
                          <span className="inline-block rounded border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                            {fact.group}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel
              title="Diagnosis codes"
              meta={codes ? `${codes.length} ${codes.length === 1 ? "code" : "codes"}` : undefined}
              contentClassName="max-h-[320px] overflow-y-auto"
            >
              {!codes ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    Process a note to list the extracted diagnosis codes.
                  </p>
                </div>
              ) : codes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No diagnosis codes were extracted from this note.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {codes.map((code) => (
                    <li key={code.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="rounded border border-foreground px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                          {code.code}
                        </span>
                        <span className="text-sm font-medium text-foreground">{code.display}</span>
                        {code.system && (
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {code.system}
                          </span>
                        )}
                      </div>
                      {code.evidence && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {code.evidence}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
