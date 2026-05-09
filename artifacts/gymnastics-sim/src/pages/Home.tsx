import { useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Orbit, Trophy } from "lucide-react";
import { listCompetitionTemplates } from "@workspace/sim-core";

import { useSimulation } from "@/context/SimulationContext";
import { getCompetitionConfig, getCompetitionDisplayLabel, getRunRoute } from "@/lib/competitionRun";
import { CompetitionCode } from "@/lib/types";

export default function Home() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const templates = useMemo(
    () => listCompetitionTemplates("fig-paris-2024"),
    [],
  );
  const hasProgress =
    state.completedPhaseKeys.length > 0
    || Object.keys(state.teams).length > 0
    || Object.keys(state.scores).length > 0
    || Object.keys(state.mixedGroups).length > 0;

  const groupedTemplates = useMemo(
    () =>
      templates.reduce<Record<string, typeof templates>>((accumulator, template) => {
        accumulator[template.competitionKind] = accumulator[template.competitionKind] || [];
        accumulator[template.competitionKind].push(template);
        return accumulator;
      }, {}),
    [templates],
  );

  const startCompetition = (competitionCode: CompetitionCode) => {
    const config = getCompetitionConfig(competitionCode);
    dispatch({ type: "INITIALIZE_RUN", payload: { competitionCode } });
    setLocation(config.phasePipeline[0].route);
  };

  const handleResume = () => {
    setLocation(getRunRoute(state, state.activePhaseKey));
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center px-4 py-16">
      <div className="absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[120px]" />

      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gold-gradient shadow-[0_0_40px_rgba(212,175,55,0.4)]">
          <Trophy className="h-12 w-12 text-slate-950" />
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-slate-900/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
          <Orbit className="h-4 w-4" />
          FIG Paris 2024 Cycle
        </div>

        <h1 className="mb-6 bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl">
          CYCLE-BASED
          <br />
          GYMNASTICS SIM
        </h1>

        <p className="mx-auto max-w-3xl text-lg font-light leading-relaxed text-slate-300 md:text-xl">
          Run Olympic-format competitions and apparatus World Cups inside a shared FIG cycle framework, with phase-aware navigation, reusable rules, and competition-specific results logic.
        </p>
      </div>

      {hasProgress && (
        <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-amber-500/20 bg-slate-900/60 px-6 py-6 text-center shadow-[0_0_30px_rgba(212,175,55,0.08)]">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Current Run</div>
          <div className="text-2xl font-display font-bold text-white">
            {getCompetitionDisplayLabel(state)}
          </div>
          <div className="text-sm text-slate-400">
            Resume from <span className="font-semibold text-slate-200">{state.activePhaseKey.replace("-", " ")}</span>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={handleResume}
              className="group relative overflow-hidden rounded-full border border-amber-500/50 bg-slate-900 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-amber-400 transition-all hover:border-amber-400 hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Resume Run
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>

            <button
              onClick={() => {
                if (confirm("Start completely fresh?")) {
                  dispatch({ type: "RESET" });
                }
              }}
              className="text-sm text-slate-500 transition-colors hover:text-slate-300 underline underline-offset-4"
            >
              Clear local run
            </button>
          </div>
        </div>
      )}

      <div className="mt-14 grid gap-8">
        {[
          { key: "OLYMPICS", title: "Olympic Competition Templates" },
          { key: "WORLD_CUP", title: "World Cup Competition Templates" },
        ].map((group) => {
          const items = groupedTemplates[group.key] || [];
          if (items.length === 0) return null;

          return (
            <section key={group.key}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-white">{group.title}</h2>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  {items.length} playable templates
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {items.map((template) => (
                  <button
                    key={template.competitionCode}
                    onClick={() => startCompetition(template.competitionCode)}
                    className="group rounded-3xl border border-amber-500/20 bg-slate-900/70 px-8 py-7 text-left transition-all hover:border-amber-400 hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(212,175,55,0.16)]"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      {template.competitionKind.replace("_", " ")} • {template.year}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-3xl font-display font-bold text-white">
                          {template.discipline}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">{template.label}</div>
                      </div>
                      <ChevronRight className="h-7 w-7 text-amber-400 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
