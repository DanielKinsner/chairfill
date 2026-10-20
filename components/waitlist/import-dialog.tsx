"use client";

import { useRef, useState } from "react";
import { Check, Download, FileSpreadsheet, TriangleAlert, X } from "lucide-react";
import { Button, Dialog, Segmented, SimTag } from "@/components/ui";
import { mapWaitlistCsv, type ImportRow } from "@/lib/csv";
import { demoNow, pushToast, useDemo } from "@/lib/store";

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const types = useDemo((s) => s.practice.appointmentTypes);
  const waitlist = useDemo((s) => s.waitlist);
  const importWaitlist = useDemo((s) => s.importWaitlist);
  const [source, setSource] = useState<"csv" | "pms">("csv");
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = (name: string, text: string) => {
    const r = mapWaitlistCsv(text, types, demoNow(), waitlist);
    setFile(name);
    setRows(r.rows);
    setMissing(r.missingColumns);
  };
  const readFile = async (f: File) => load(f.name, await f.text());
  const useSample = async () => {
    const res = await fetch("/samples/waitlist-sample.csv");
    load("waitlist-sample.csv", await res.text());
  };

  const ready = rows?.filter((r) => r.entry) ?? [];
  const bad = rows?.filter((r) => !r.entry) ?? [];

  return (
    <Dialog open onClose={onClose} title="Add patients in bulk" className="max-w-[760px]">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <Segmented
          label="Import from"
          value={source}
          onChange={setSource}
          options={[
            { value: "csv", label: "CSV file" },
            { value: "pms", label: "Practice software" },
          ]}
        />

        {source === "pms" ? (
          <div className="open-outline mt-4 rounded-card p-5">
            <div className="flex items-center gap-2">
              <p className="font-semibold">Sync the ASAP list from Dentrix, Eaglesoft or Open Dental</p>
              <SimTag />
            </div>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              In production, ChairFill reads your ASAP list and schedule straight from the practice software every few minutes, and writes filled appointments back. For this
              demo, export the list as a CSV and import it on the other tab.
            </p>
            <Button className="mt-3" onClick={() => setSource("csv")}>
              Use a CSV instead
            </Button>
          </div>
        ) : rows === null ? (
          <>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) void readFile(f);
              }}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-card px-6 py-10 text-center transition-colors ${drag ? "open-outline-amber" : "open-outline hover:bg-surface"}`}
            >
              <FileSpreadsheet className="size-7 text-slate" strokeWidth={1.5} />
              <span className="mt-2 font-semibold text-ink">Drop a CSV here, or click to choose one</span>
              <span className="mt-1 text-[13px] text-slate-ink">One patient per row. Columns: first_name, last_name, mobile, visit, urgency, days, times, added, insurance, notes.</span>
              <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void readFile(e.target.files[0])} />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
              <Button variant="ghost" onClick={useSample}>
                Try the sample file
              </Button>
              <a href="/samples/waitlist-sample.csv" download className="inline-flex items-center gap-1.5 font-medium text-teal-ink hover:underline">
                <Download className="size-3.5" /> Download the sample
              </a>
            </div>
          </>
        ) : missing.length ? (
          <div className="mt-4 rounded-card border border-danger/40 bg-danger-soft p-4 text-[13.5px]">
            <p className="font-semibold text-danger">{file} is missing columns ChairFill needs: {missing.join(", ")}.</p>
            <p className="mt-1 text-ink-2">Add them to the first row and try again. The sample file shows the layout.</p>
            <Button className="mt-3" onClick={() => setRows(null)}>
              Choose another file
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <p className="font-semibold">{file}</p>
              <p className="text-[13px] text-slate-ink">
                <span className="text-green-ink">{ready.length} ready</span>
                {bad.length ? <span className="text-danger">, {bad.length} need fixing</span> : null}
              </p>
              <button className="ml-auto text-[13px] font-medium text-teal-ink hover:underline" onClick={() => setRows(null)}>
                Choose another file
              </button>
            </div>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line">
              {rows.map((r) => (
                <li key={r.line} className={`flex items-start gap-3 px-3 py-2 text-[13px] ${r.entry ? "" : "bg-danger-soft/50"}`}>
                  <span className="num w-8 shrink-0 pt-0.5 text-[11.5px] text-slate-ink">#{r.line}</span>
                  {r.entry ? <Check className="mt-0.5 size-4 shrink-0 text-green" /> : <X className="mt-0.5 size-4 shrink-0 text-danger" />}
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{r.name}</span>
                    {r.entry ? (
                      <span className="ml-2 text-slate-ink">
                        {types.find((t) => t.id === r.entry!.procedureId)?.name}, <span className="num">{r.entry.phone}</span>
                      </span>
                    ) : null}
                    {r.errors.map((e) => (
                      <span key={e} className="block text-danger">
                        {e}
                      </span>
                    ))}
                    {r.warnings.map((w) => (
                      <span key={w} className="flex items-center gap-1 text-amber-ink">
                        <TriangleAlert className="size-3" /> {w}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-3">
        <p className="text-[12.5px] text-slate-ink">{bad.length ? "Rows that need fixing are skipped. Fix them in the file and import again." : ""}</p>
        <Button className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={ready.length === 0 || source !== "csv"}
          onClick={() => {
            const n = importWaitlist(
              ready.map((r) => r.entry!),
              file ?? "CSV",
            );
            pushToast({ tone: "info", title: `Added ${n} patients to the waitlist`, body: "They're in line for the next matching opening." });
            onClose();
          }}
        >
          {ready.length ? `Add ${ready.length} patients` : "Add patients"}
        </Button>
      </div>
    </Dialog>
  );
}
