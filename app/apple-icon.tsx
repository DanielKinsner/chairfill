import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F8B8D" }}>
        <svg width="112" height="112" viewBox="0 0 24 24">
          <path fill="#fff" d="M13.2 2.5 5.4 13.1c-.3.4 0 .9.5.9h4.9l-1.1 7.3c-.1.6.6.9 1 .4l7.9-10.7c.3-.4 0-.9-.5-.9h-4.9l1.1-7.2c.1-.6-.7-.9-1.1-.4Z" />
        </svg>
      </div>
    ),
    size,
  );
}
