"use client";

import { SealState } from "@/lib/types";

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
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    border: "1.5px solid #B08D3E",
    flexShrink: 0,
    background:
      state === "logrado"
        ? "#B08D3E"
        : state === "parcial"
        ? "linear-gradient(90deg, #B08D3E 50%, transparent 50%)"
        : "transparent",
  };

  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style} aria-label={state}>
      {state === "logrado" && (
        <span style={{ color: "#ECE6D6", fontSize: size * 0.5, lineHeight: 1, fontFamily: "Lora, serif" }}>+</span>
      )}
    </button>
  );
}
