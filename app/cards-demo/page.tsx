"use client";
import React from "react";
import Card from "../admin/_components/Card";

export default function CardsDemoRoot() {
  return (
    <main className="p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-slate-100">
        Admin Card Variants (Public Demo)
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="default" heading="Default">
          <p className="text-sm text-slate-700 dark:text-slate-300">A neutral, subtle card with slight blur.</p>
        </Card>

        <Card variant="outlined" heading="Outlined">
          <p className="text-sm text-slate-700 dark:text-slate-300">Minimal, works well on colorful backdrops.</p>
        </Card>

        <Card variant="elevated" heading="Elevated">
          <p className="text-sm text-slate-700 dark:text-slate-300">Stronger shadow for emphasis and grouping.</p>
        </Card>

        <Card variant="accent" heading="Accent">
          <p className="text-sm text-indigo-700 dark:text-indigo-200">Accent gradient for highlighted sections.</p>
        </Card>

        <Card
          variant="interactive"
          heading="Interactive"
          onClick={() => console.log("interactive demo click")}
        >
          <p className="text-sm text-slate-700 dark:text-slate-300">Clickable card with hover & focus affordances.</p>
        </Card>
      </div>
    </main>
  );
}
