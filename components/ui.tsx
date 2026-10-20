"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

// ---------------------------------------------------------------- button

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-teal-ink text-white hover:bg-teal-deep border border-teal-ink hover:border-teal-deep disabled:bg-line-strong disabled:border-line-strong",
  secondary: "bg-white text-ink border border-line-strong hover:border-slate hover:bg-surface",
  ghost: "bg-transparent text-teal-ink border border-transparent hover:bg-teal-wash",
  quiet: "bg-transparent text-slate-ink border border-transparent hover:bg-surface hover:text-ink",
  danger: "bg-white text-danger border border-line-strong hover:border-danger hover:bg-danger-soft",
};
const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-[14px] gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-card font-medium transition-colors duration-150 disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------- chip

export type Tone = "neutral" | "teal" | "amber" | "green" | "danger" | "outline" | "urgent";
const tones: Record<Tone, string> = {
  neutral: "bg-surface text-slate-ink border-line",
  teal: "bg-teal-soft text-teal-deep border-teal-soft",
  amber: "bg-amber-soft text-amber-ink border-amber-soft",
  green: "bg-green-soft text-green-ink border-green-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
  outline: "bg-white text-slate-ink border-line-strong",
  urgent: "bg-white text-danger border-danger/40",
};

export function Chip({ tone = "neutral", children, className = "", title, dot }: { tone?: Tone; children: ReactNode; className?: string; title?: string; dot?: boolean }) {
  return (
    <span
      title={title}
      className={`inline-flex h-[22px] max-w-full items-center gap-1.5 truncate rounded-[6px] border px-2 text-[12px] font-medium leading-none ${tones[tone]} ${className}`}
    >
      {dot ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- dialog (native, so focus and Esc come free)

export function Dialog({
  open,
  onClose,
  title,
  children,
  className = "",
  labelledBy,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  side?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const autoId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const handler = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", handler);
    return () => d.removeEventListener("cancel", handler);
  }, [onClose]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? (title ? autoId : undefined)}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={
        side
          ? `m-0 ml-auto h-dvh max-h-dvh w-full max-w-[480px] border-l border-line bg-white p-0 shadow-pop open:animate-fade-in ${className}`
          : `m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] rounded-card border border-line bg-white p-0 shadow-pop open:animate-fade-in ${className}`
      }
    >
      {open ? (
        <div className="flex h-full max-h-[inherit] flex-col">
          {title ? (
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <h2 id={autoId} className="text-[16px] font-semibold">
                {title}
              </h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
          ) : null}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function IconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-card text-slate-ink transition-colors hover:bg-surface hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- form bits

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-slate-ink">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputCls =
  "h-9 w-full rounded-card border border-line-strong bg-white px-3 text-[14px] text-ink placeholder:text-slate transition-colors hover:border-slate focus:border-teal focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal aria-[invalid=true]:border-danger";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; hint?: string }[];
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-card border border-line-strong bg-surface p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={`rounded-[6px] font-medium transition-colors ${size === "sm" ? "h-6 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]"} ${
              on ? "bg-white text-ink shadow-[0_0_0_1px_var(--color-line-strong)]" : "text-slate-ink hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${checked ? "border-teal-ink bg-teal-ink" : "border-line-strong bg-line"}`}
    >
      <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[17px]" : "translate-x-[1px]"}`} />
    </button>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-skeleton rounded-[6px] bg-surface ${className}`} />;
}

export function SimTag({ className = "" }: { className?: string }) {
  return (
    <span
      title="Demo mode: nothing is actually sent."
      className={`inline-flex h-[18px] items-center rounded-[4px] border border-dashed border-line-strong px-1.5 text-[11px] font-medium text-slate-ink ${className}`}
    >
      Simulated
    </span>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`num ${className}`}>${value.toLocaleString("en-US")}</span>;
}
