'use client';

import Image from 'next/image';
import Link from 'next/link';
import AppBackground from '@/components/AppBackground';

export default function HomePage() {
  return (
    <AppBackground variant="hero" className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <div className="mb-8 flex justify-center lg:justify-start">
              <Image
                src="/Quizam_Logo.png"
                alt="Quizam logo"
                width={420}
                height={180}
                priority
                className="h-auto w-full max-w-[320px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:max-w-[380px] lg:max-w-[420px]"
              />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Modern live trivia for real-world venues
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Quizam helps hosts run polished in-person trivia nights with
              streamlined game management, team play, and a cleaner experience
              than pen-and-paper.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
              >
                Sign In
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Register
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm font-semibold text-blue-300">For hosts</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Build games, manage rounds and questions, and run a smoother
                  show on trivia night.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm font-semibold text-emerald-300">For teams</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Join from a single team device and submit answers through a
                  clean game flow.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:col-span-2">
                <p className="text-sm font-semibold text-amber-300">
                  Built for live play
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Designed to enhance the in-person trivia experience, not
                  replace it. Quizam keeps players present in the venue while
                  giving hosts better tools and a more modern presentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppBackground>
  );
}