// The ChairFill mark: a chair slot (8px-rounded square, same radius as every
// card in the app) holding the bolt that marks a ChairFill-filled appointment.

export const BOLT_PATH = "M13.2 2.5 5.4 13.1c-.3.4 0 .9.5.9h4.9l-1.1 7.3c-.1.6.6.9 1 .4l7.9-10.7c.3-.4 0-.9-.5-.9h-4.9l1.1-7.2c.1-.6-.7-.9-1.1-.4Z";

export function Bolt({ className = "size-3", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden={title ? undefined : true} role={title ? "img" : undefined} fill="currentColor">
      {title ? <title>{title}</title> : null}
      <path d={BOLT_PATH} />
    </svg>
  );
}

export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0F8B8D" />
      <g transform="translate(4 4)">
        <path d={BOLT_PATH} fill="#fff" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark className="size-7 shrink-0" />
      <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink">ChairFill</span>
    </span>
  );
}
