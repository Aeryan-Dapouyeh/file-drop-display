import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { FileText, Upload, X, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medical Note Processor" },
      { name: "description", content: "Drop a medical note .txt file or paste text to extract facts and medical codes." },
      { property: "og:title", content: "Medical Note Processor" },
      { property: "og:description", content: "Drop a medical note .txt file or paste text to extract facts and medical codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
  }, []);

  const onProcess = useCallback(() => {
    if (!text.trim()) return;
    // Placeholder for Phase 3: send text to the backend for extraction.
    alert("Process clicked — backend integration coming in the next phase.");
  }, [text]);

  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Medical Note Processor
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Drop a journal note or paste text to prepare it for fact and medical code extraction.
          </p>
        </header>

        <div className="space-y-8">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`relative rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              isDragging ? "bg-secondary border-foreground" : "border-border hover:bg-secondary"
            }`}
          >
            <div className="relative z-10 flex flex-col items-center gap-3 pointer-events-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
                <Upload className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  Drop a .txt file here
                </p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
            </div>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={onFileInputChange}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Upload a .txt file"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {fileName && (
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span className="font-medium text-foreground">{fileName}</span>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="note-text">Journal text</Label>
              <span className="text-xs text-muted-foreground">
                {text.length} characters
              </span>
            </div>
            <Textarea
              id="note-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste text here, or drop a .txt file above..."
              className="min-h-[320px] resize-y border-foreground/20 font-mono text-base leading-relaxed focus-visible:border-foreground focus-visible:ring-foreground"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onProcess}
              disabled={!text.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Process note
            </Button>
            <Button
              variant="outline"
              onClick={clear}
              disabled={!text && !fileName}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
