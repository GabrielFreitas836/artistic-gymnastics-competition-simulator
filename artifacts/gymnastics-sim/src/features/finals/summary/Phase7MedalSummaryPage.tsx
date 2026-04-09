import { ChevronLeft, Medal, ShieldAlert, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { PageHero } from "@/components/simulation/layout/PageHero";
import { PageShell } from "@/components/simulation/layout/PageShell";
import { StatusNotice } from "@/components/simulation/status/StatusNotice";
import { useSimulation } from "@/context/SimulationContext";
import { getCountryById } from "@/lib/countries";
import {
  getCountryMedalSummary,
  getFinalsCompletionSummary,
  getGymnastMedalSummary,
} from "@/lib/simulation/finals/summary";

const MEDAL_CLASS: Record<"Gold" | "Silver" | "Bronze", string> = {
  Gold: "text-amber-400",
  Silver: "text-[#c0c7d1]",
  Bronze: "text-[#c9733d]",
};

export default function Phase7MedalSummaryPage() {
  const [, setLocation] = useLocation();
  const { state } = useSimulation();

  const completion = useMemo(() => getFinalsCompletionSummary(state), [state]);
  const countrySummary = useMemo(() => getCountryMedalSummary(state), [state]);
  const gymnastSummary = useMemo(() => getGymnastMedalSummary(state), [state]);

  if (!completion.isMedalTableUnlocked) {
    return (
      <PageShell width="medium">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setLocation("/finals")}
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" /> Back to Finals
          </button>
        </div>

        <StatusNotice tone="danger" className="justify-center p-8 text-center">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="mb-3 font-display text-3xl font-bold text-white">Medal Table Locked</h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              Finish Team Final, All-Around Final and the four apparatus finals to unlock the medal summary page.
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-rose-300">
              {completion.completedFinals}/{completion.totalFinals} finals completed
            </p>
          </div>
        </StatusNotice>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide" className="max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLocation("/finals")}
          className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" /> Back to Finals
        </button>
      </div>

      <PageHero
        align="center"
        icon={<Medal className="h-8 w-8 text-slate-950" />}
        title="PHASE 7 MEDAL SUMMARY"
        description="Complete medal overview for countries and gymnasts after all finals are finished."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <GlassSection>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Finals Completed
          </div>
          <div className="mt-3 text-3xl font-bold text-white">
            {completion.completedFinals}/{completion.totalFinals}
          </div>
        </GlassSection>
        <GlassSection>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Countries with Medals
          </div>
          <div className="mt-3 text-3xl font-bold text-white">{countrySummary.length}</div>
        </GlassSection>
        <GlassSection>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Gymnasts with Medals
          </div>
          <div className="mt-3 text-3xl font-bold text-white">{gymnastSummary.length}</div>
        </GlassSection>
      </div>

      <div className="mt-8 space-y-8">
        <GlassSection>
          <div className="mb-5 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="font-display text-2xl font-bold text-white">Countries</h3>
              <p className="mt-1 text-sm text-slate-400">
                Ordered by total medals, then gold, silver and bronze.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {countrySummary.map((entry) => {
              const country = getCountryById(entry.countryId);

              return (
                <div
                  key={entry.countryId}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{country.flag}</span>
                      <div>
                        <div className="font-display text-xl font-bold text-white">
                          {country.name}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                          <span>Total {entry.totalCount}</span>
                          <span className={MEDAL_CLASS.Gold}>Gold {entry.goldCount}</span>
                          <span className={MEDAL_CLASS.Silver}>Silver {entry.silverCount}</span>
                          <span className={MEDAL_CLASS.Bronze}>Bronze {entry.bronzeCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.medals.map((medal, index) => (
                      <span
                        key={`${entry.countryId}_${medal.eventKey}_${index}`}
                        className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                      >
                        <span className={MEDAL_CLASS[medal.medal]}>{medal.medal}</span> {medal.eventLabel}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassSection>

        <GlassSection>
          <div className="mb-5 flex items-center gap-3">
            <Medal className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="font-display text-2xl font-bold text-white">Gymnasts</h3>
              <p className="mt-1 text-sm text-slate-400">
                Ordered by medal count with each podium result listed below.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {gymnastSummary.map((entry) => {
              const country = getCountryById(entry.countryId);

              return (
                <div
                  key={entry.gymnastId}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{country.flag}</span>
                      <div>
                        <div className="font-display text-xl font-bold text-white">
                          {entry.gymnastName}
                        </div>
                        <div className="mt-1 text-[11px] uppercase tracking-widest text-slate-500">
                          {country.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                      <span>Total {entry.totalCount}</span>
                      <span className={MEDAL_CLASS.Gold}>Gold {entry.goldCount}</span>
                      <span className={MEDAL_CLASS.Silver}>Silver {entry.silverCount}</span>
                      <span className={MEDAL_CLASS.Bronze}>Bronze {entry.bronzeCount}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.medals.map((medal, index) => (
                      <span
                        key={`${entry.gymnastId}_${medal.eventKey}_${index}`}
                        className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300"
                      >
                        <span className={MEDAL_CLASS[medal.medal]}>{medal.medal}</span> {medal.eventLabel}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassSection>
      </div>
    </PageShell>
  );
}
