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
    bg: "rgba(255,255,255,0.9)",
    border: "rgba(15,23,42,0.06)",
    text: "#0f172a",
    accent: "#6366f1",
  },
  outlined: {
    bg: "transparent",
    border: "rgba(148,163,184,0.24)",
    text: "#0f172a",
    accent: "#6366f1",
  },
  elevated: {
    bg: "#ffffff",
    border: "transparent",
    text: "#0f172a",
    accent: "#6366f1",
  },
  accent: {
    bg: "linear-gradient(90deg, #eef2ff 0%, #ffffff 100%)",
    border: "transparent",
    text: "#3730a3",
    accent: "#6366f1",
  },
  interactive: {
    bg: "#ffffff",
    border: "rgba(15,23,42,0.06)",
    text: "#0f172a",
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
  const base = "rounded-2xl p-4 transition-shadow transition-transform will-change-transform";

  const resolved: TokenSet = { ...defaultTokens[variant], ...(tokens || {}) };

  const styleVars: React.CSSProperties = {
    // set CSS custom properties so they can be overridden globally or per-card
    ["--card-bg" as any]: resolved.bg,
    ["--card-border" as any]: resolved.border,
    ["--card-text" as any]: resolved.text,
    ["--card-accent" as any]: resolved.accent,
  };

  const variantExtras: Record<Variant, string> = {
    default: "shadow-sm backdrop-blur-sm",
    outlined: "",
    elevated: "shadow-lg",
    accent: "",
    interactive: "shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
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
