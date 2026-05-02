"use client";
import React from "react";

type Variant = "default" | "outlined" | "elevated" | "accent" | "interactive";

interface TokenSet {
  bg: string;
  border: string;
  text: string;
  accent?: string;
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  heading?: React.ReactNode;
  /**
   * Optional token overrides to experiment with color schemes per-card.
   * Values should be valid CSS color strings (hex, rgb, rgba, color() etc.).
   */
  tokens?: Partial<TokenSet>;
}

const defaultTokens: Record<Variant, TokenSet> = {
  default: {
    bg: "rgba(255,255,255,0.88)",
    border: "rgba(15,23,42,0.08)",
    text: "#071233",
    accent: "#4f46e5",
  },
  outlined: {
    bg: "rgba(255,255,255,0.02)",
    border: "rgba(148,163,184,0.18)",
    text: "#0f172a",
    accent: "#6366f1",
  },
  elevated: {
    bg: "rgba(255,255,255,0.98)",
    border: "rgba(15,23,42,0.04)",
    text: "#071233",
    accent: "#6366f1",
  },
  accent: {
    bg: "linear-gradient(180deg, rgba(239,246,255,0.9) 0%, rgba(255,255,255,0.95) 100%)",
    border: "transparent",
    text: "#3730a3",
    accent: "#6366f1",
  },
  interactive: {
    bg: "rgba(255,255,255,0.98)",
    border: "rgba(15,23,42,0.1)",
    text: "#071233",
    accent: "#6366f1",
  },
};

export default function Card({
  variant = "default",
  heading,
  className = "",
  tokens,
  children,
  ...rest
}: CardProps) {
  const base = "card rounded-3xl p-5 transition-shadow transition-transform will-change-transform";

  const resolved: TokenSet = { ...defaultTokens[variant], ...(tokens || {}) };

  const styleVars: React.CSSProperties = {
    // set CSS custom properties so they can be overridden globally or per-card
    ["--card-bg" as any]: resolved.bg,
    ["--card-border" as any]: resolved.border,
    ["--card-text" as any]: resolved.text,
    ["--card-accent" as any]: resolved.accent,
  };

  const variantExtras: Record<Variant, string> = {
    default: "",
    outlined: "bg-opacity-60",
    elevated: "shadow-[var(--card-elevated-shadow)]",
    accent: "",
    interactive: "hover:shadow-[0_18px_40px_rgba(2,6,23,0.12)] hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--card-accent)]/30",
  };

  const classNames = [
    base,
    // use CSS variables for colors so we can tweak them centrally
    "bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--card-text)]",
    variantExtras[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const roleProps: React.HTMLAttributes<HTMLDivElement> = {};
  if ((rest as any).onClick) {
    roleProps.role = "button";
    roleProps.tabIndex = 0 as any;
  }

  return (
    <div className={classNames} style={styleVars} {...roleProps} {...rest}>
      {heading ? <div className="mb-2 text-sm font-semibold">{heading}</div> : null}
      <div>{children}</div>
    </div>
  );
}
