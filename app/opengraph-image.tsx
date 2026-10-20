import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "ChairFill: an empty chair fills itself. A cancelled appointment becomes a filled one, by text.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BOLT = "M13.2 2.5 5.4 13.1c-.3.4 0 .9.5.9h4.9l-1.1 7.3c-.1.6.6.9 1 .4l7.9-10.7c.3-.4 0-.9-.5-.9h-4.9l1.1-7.2c.1-.6-.7-.9-1.1-.4Z";
const font = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));

function Slot({ time, name, state }: { time: string; name: string; state: "booked" | "open" | "filled" }) {
  const styles = {
    booked: { background: "#F7F9FA", border: "1.5px solid #E2E8EC", color: "#17202A" },
    open: { background: "#FFFFFF", border: "2px dashed #C9D3DA", color: "#566577" },
    filled: { background: "#0F8B8D", border: "1.5px solid #0F8B8D", color: "#FFFFFF" },
  }[state];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, height: 62, borderRadius: 8, padding: "0 18px", ...styles }}>
      <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 20, opacity: state === "filled" ? 0.9 : 0.75, width: 70 }}>{time}</div>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 600, flex: 1 }}>{name}</div>
      {state === "filled" ? (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path fill="#fff" d={BOLT} />
        </svg>
      ) : null}
    </div>
  );
}

export default async function OgImage() {
  const [regular, semibold, mono] = await Promise.all([
    font("ibm-plex-sans", "ibm-plex-sans-latin-400-normal.woff"),
    font("ibm-plex-sans", "ibm-plex-sans-latin-600-normal.woff"),
    font("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff"),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFFFFF", fontFamily: "Plex Sans", color: "#17202A", padding: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 48, height: 48, borderRadius: 12, background: "#0F8B8D", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path fill="#fff" d={BOLT} />
              </svg>
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>ChairFill</div>
          </div>
          <div style={{ display: "flex", marginTop: 64, fontSize: 66, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1.5 }}>An empty chair fills itself.</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 27, lineHeight: 1.35, color: "#2F3B48" }}>
            When a patient cancels, ChairFill texts the waitlist in order. The first yes gets the chair. Nobody works the phones.
          </div>
          <div style={{ display: "flex", marginTop: "auto", gap: 48 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 40, color: "#0A6869" }}>$3,920</div>
              <div style={{ display: "flex", fontSize: 20, color: "#566577" }}>recovered in October</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 40 }}>14</div>
              <div style={{ display: "flex", fontSize: 20, color: "#566577" }}>chairs filled by text</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 400, gap: 10, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 18, color: "#566577", marginBottom: 6 }}>Tuesday, Chair 5, Marisol Vega</div>
          <Slot time="11:00" name="Ana Velasquez" state="booked" />
          <Slot time="1:00" name="Doug Harper" state="booked" />
          <Slot time="2:00" name="Rosa Delgado" state="filled" />
          <Slot time="3:00" name="Open" state="open" />
          <Slot time="4:00" name="Wes Navarro" state="booked" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex Sans", data: regular, weight: 400, style: "normal" },
        { name: "Plex Sans", data: semibold, weight: 600, style: "normal" },
        { name: "Plex Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
