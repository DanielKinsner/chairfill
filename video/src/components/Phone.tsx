import React from "react";
import { interpolate } from "remotion";
import { colors, fonts, clamp, easeOut } from "../theme";
import { PHONE } from "../layout";
import { fadeIn, rise } from "../anim";
import { StatusChip, type ChipState } from "./Chip";

export type Message = {
  at: number;
  side: "in" | "out";
  content: React.ReactNode;
};

export type Typing = {
  start: number; // first letter appears
  text: string;
  tap: number; // finger taps send
  sent: number; // bubble appears, field clears
};

const SCREEN_W = PHONE.w - PHONE.bezel * 2;
const SCREEN_H = PHONE.h - PHONE.bezel * 2;
const INPUT_H = 44;
const INPUT_MARGIN = 12;
const SEND = 32;

/** Minimal phone outline: rounded rectangle, notch pill, one SMS thread, a reply field. */
export const Phone: React.FC<{
  frame: number;
  index: number;
  appearAt: number;
  name: string;
  number: string;
  chip: ChipState[];
  messages: Message[];
  typing?: Typing;
}> = ({ frame, index, appearAt, name, number, chip, messages, typing }) => {
  const x = PHONE.xs[index];
  const enter = fadeIn(frame, appearAt, 12);
  const firstAt = messages[0]?.at ?? Infinity;

  // Reply field (only Rosa types)
  let typed = "";
  let caret = false;
  const typingActive = typing !== undefined && frame >= typing.start - 10 && frame < typing.sent;
  if (typing && typingActive) {
    const n = Math.floor(
      interpolate(frame, [typing.start, typing.start + 12], [0, typing.text.length], clamp),
    );
    typed = typing.text.slice(0, n);
    caret = frame < typing.tap && Math.floor(frame / 8) % 2 === 0;
  }
  const sendActive = typed.length > 0;
  const ripple = typing
    ? interpolate(frame, [typing.tap, typing.tap + 24], [0, 1], { ...clamp, easing: easeOut })
    : 0;
  const rippleOn = typing ? frame >= typing.tap && frame < typing.tap + 24 : false;
  const press = typing
    ? interpolate(frame, [typing.tap, typing.tap + 3, typing.tap + 9], [1, 0.86, 1], clamp)
    : 1;

  return (
    <div style={{ opacity: enter, fontFamily: fonts.sans }}>
      {/* Label above the phone */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: PHONE.labelY + rise(frame, appearAt, 10),
          width: PHONE.w,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: colors.ink, lineHeight: "26px" }}>
            {name}
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 17,
              color: colors.slate,
              marginTop: 4,
              letterSpacing: "-0.01em",
            }}
          >
            {number}
          </div>
        </div>
        <StatusChip frame={frame} states={chip} />
      </div>

      {/* Phone body */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: PHONE.y + rise(frame, appearAt, 16, 14),
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: 44,
          border: `1px solid #C9D2D9`,
          backgroundColor: colors.white,
          padding: PHONE.bezel - 1,
        }}
      >
        <div
          style={{
            position: "relative",
            width: SCREEN_W,
            height: SCREEN_H,
            borderRadius: 34,
            backgroundColor: colors.white,
            border: `1px solid ${colors.border}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Notch */}
          <div
            style={{
              alignSelf: "center",
              marginTop: 12,
              width: 76,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.border,
            }}
          />
          {/* Thread header */}
          <div
            style={{
              textAlign: "center",
              padding: "12px 0 12px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: colors.ink }}>Maple Family Dental</div>
            <div style={{ fontSize: 13, color: colors.slate, marginTop: 2 }}>Text message</div>
          </div>

          {/* Thread */}
          <div
            style={{
              flex: 1,
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                alignSelf: "center",
                fontSize: 13,
                color: colors.slate,
                opacity: fadeIn(frame, firstAt),
              }}
            >
              Today <span style={{ fontFamily: fonts.mono, fontSize: 12 }}>9:41 AM</span>
            </div>
            {messages.map((m, i) =>
              frame >= m.at ? (
                <Bubble key={i} frame={frame} at={m.at} side={m.side}>
                  {m.content}
                </Bubble>
              ) : null,
            )}
          </div>

          {/* Reply field */}
          <div
            style={{
              position: "relative",
              margin: `0 ${INPUT_MARGIN}px ${INPUT_MARGIN}px`,
              height: INPUT_H,
              borderRadius: INPUT_H / 2,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              display: "flex",
              alignItems: "center",
              padding: "0 6px 0 16px",
            }}
          >
            <div style={{ flex: 1, fontSize: 16, display: "flex", alignItems: "center", height: 22 }}>
              {typingActive ? (
                <>
                  <span style={{ color: colors.ink, fontWeight: 500 }}>{typed}</span>
                  {caret ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: 20,
                        marginLeft: 2,
                        backgroundColor: colors.teal,
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <span style={{ color: "#9AA6B2" }}>Text message</span>
              )}
            </div>
            <div
              style={{
                position: "relative",
                width: SEND,
                height: SEND,
                borderRadius: SEND / 2,
                backgroundColor: sendActive ? colors.teal : colors.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: String(press),
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24">
                <path
                  d="M12 19V5 M6 11l6-6 6 6"
                  fill="none"
                  stroke={colors.white}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {rippleOn ? (
                <div
                  style={{
                    position: "absolute",
                    left: SEND / 2 - (16 + 40 * ripple),
                    top: SEND / 2 - (16 + 40 * ripple),
                    width: (16 + 40 * ripple) * 2,
                    height: (16 + 40 * ripple) * 2,
                    borderRadius: "50%",
                    border: `2px solid ${colors.teal}`,
                    backgroundColor: "rgba(15,139,141,0.16)",
                    opacity: 0.9 * (1 - ripple),
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Bubble: React.FC<{
  frame: number;
  at: number;
  side: "in" | "out";
  children: React.ReactNode;
}> = ({ frame, at, side, children }) => {
  const p = fadeIn(frame, at, 10);
  const incoming = side === "in";
  return (
    <div
      style={{
        alignSelf: incoming ? "flex-start" : "flex-end",
        maxWidth: 252,
        padding: "10px 13px",
        borderRadius: 14,
        borderBottomLeftRadius: incoming ? 4 : 14,
        borderBottomRightRadius: incoming ? 14 : 4,
        backgroundColor: incoming ? colors.bubble : colors.teal,
        color: incoming ? colors.ink : colors.white,
        fontSize: 16,
        lineHeight: "22px",
        fontWeight: incoming ? 400 : 600,
        opacity: p,
        translate: `0px ${(1 - p) * 10}px`,
        scale: String(0.96 + 0.04 * p),
        transformOrigin: incoming ? "left bottom" : "right bottom",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
};
