"use client";
import React from "react";

type Variant = "default" | "outlined" | "elevated" | "accent" | "interactive";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  heading?: React.ReactNode;
}

export default function Card({
  variant = "default",
  heading,
  className = "",
  children,
  ...rest
}: CardProps) {
  const base = "rounded-2xl p-4 transition-shadow transition-transform will-change-transform";

  const variants: Record<Variant, string> = {
    default:
      "bg-white/80 dark:bg-slate-800 border border-white/10 dark:border-slate-700 shadow-sm backdrop-blur-sm",
    outlined: "bg-transparent border border-slate-200 dark:border-slate-700",
    elevated: "bg-white dark:bg-slate-800 border border-transparent shadow-lg",
    accent:
      "bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/30 dark:to-slate-800 border border-transparent",
    interactive:
      "bg-white dark:bg-slate-800 border border-white/10 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40",
  };

  const classNames = [base, variants[variant], className].filter(Boolean).join(" ");

  const roleProps: React.HTMLAttributes<HTMLDivElement> = {};
  if ((rest as any).onClick) {
    roleProps.role = "button";
    roleProps.tabIndex = 0 as any;
  }

  return (
    <div className={classNames} {...roleProps} {...rest}>
      {heading ? <div className="mb-2 text-sm font-semibold">{heading}</div> : null}
      <div>{children}</div>
    </div>
  );
}
