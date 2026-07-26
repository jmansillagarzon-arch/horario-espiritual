"use client";

import { SealState } from "@/lib/types";

const STATE_STYLES: Record<SealState, { border: string; background: string }> = {
  no: { border: "#D1D5DB", background: "transparent" },
  parcial: { border: "#F59E0B", background: "linear-gradient(90deg, #F59E0B 50%, transparent 50%)" },
  logrado: { border: "#10B981", background: "#10B981" },
};

export default function Seal({
  state,
  size = 26,
  onClick,
  disabled = false,
}: {
  state: SealState;
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const colors = STATE_STYLES[state];
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    border: `1.5px solid ${colors.border}`,
    flexShrink: 0,
    background: colors.background,
    transition: "border-color 120ms ease, background 120ms ease",
  };

  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style} aria-label={state}>
      {state === "logrado" && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 12.5L9.5 18L20 6"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
