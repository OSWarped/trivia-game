"use client";
import React from "react";
import Card from "../_components/Card";

export default function CardsDemoPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Admin Card Variants</h1>

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
          onClick={() => alert("Interactive card clicked")}
        >
          <p className="text-sm text-slate-700 dark:text-slate-300">Clickable card with hover & focus affordances.</p>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Examples</h2>
        <div className="space-y-4">
          <Card>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Players</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">1,234</div>
            <div className="mt-1 text-sm text-slate-600">Active this month</div>
          </Card>

          <Card variant="accent">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Live Events</div>
                <div className="text-xs text-slate-700 dark:text-slate-300">3 running now</div>
              </div>
              <div className="text-indigo-600 font-bold">●</div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
