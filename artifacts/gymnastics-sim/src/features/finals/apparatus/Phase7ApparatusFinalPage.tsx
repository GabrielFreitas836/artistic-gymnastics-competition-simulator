import { ChevronLeft, RotateCcw, ShieldAlert, Trophy } from "lucide-react";
import { useMemo } from "react";

import { PageHero } from "@/components/simulation/layout/PageHero";
import { PageShell } from "@/components/simulation/layout/PageShell";
import { StatusNotice } from "@/components/simulation/status/StatusNotice";
import { getCountryById } from "@/lib/countries";
import { getFinalsCompletionSummary } from "@/lib/simulation/finals/summary";
import { ApparatusKey } from "@/lib/types";

import { ApparatusFinalOrderSetupDialog } from "./components/ApparatusFinalOrderSetupDialog";
import { ApparatusFinalScoringPanel } from "./components/ApparatusFinalScoringPanel";
import { ApparatusFinalStandings } from "./components/ApparatusFinalStandings";
import { useApparatusFinalController } from "./hooks/useApparatusFinalController";

export default function Phase7ApparatusFinalPage({
  apparatus,
}: {
  apparatus: ApparatusKey;
}) {
  const controller = useApparatusFinalController(apparatus);
  const finalsCompletion = useMemo(
    () => getFinalsCompletionSummary(controller.state),
    [controller.state],
  );

  const winner = controller.qualificationPool.qualified[0];

  if (!controller.qualificationCompletion.isComplete) {
    return (
      <PageShell width="medium">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={controller.goBackToFinals}
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
            <h2 className="mb-3 font-display text-3xl font-bold text-white">
              {controller.apparatusLabel} Final Locked
            </h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              {controller.qualificationCompletion.message}
            </p>
          </div>
        </StatusNotice>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <ApparatusFinalOrderSetupDialog
        open={controller.stage === "setup"}
        apparatusCode={controller.apparatusCode}
        apparatusLabel={controller.apparatusLabel}
        qualified={controller.qualificationPool.qualified}
        orderDraft={controller.orderDraft}
        setupError={controller.setupError}
        onMove={controller.moveOrderItem}
        onRandomize={controller.handleRandomizeOrder}
        onConfirm={controller.handleConfirmOrder}
      />

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={controller.goBackToFinals}
            className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" /> Back to Finals
          </button>
          <button
            type="button"
            onClick={controller.handleRestartFinal}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-rose-500/30 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Final
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
          <span>{controller.qualificationPool.qualified.length} finalists</span>
          <span>{controller.qualificationPool.reserves.length} reserves</span>
          <span>
            {controller.completedRoutineCount}/
            {controller.slots.length * controller.routineCount || controller.routineCount} routines done
          </span>
        </div>
      </div>

      <PageHero
        title={`${controller.apparatusLabel.toUpperCase()} FINAL`}
        action={
          finalsCompletion.isMedalTableUnlocked ? (
            <button
              type="button"
              onClick={controller.goToMedalSummary}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition-colors hover:bg-amber-400"
            >
              Medal Table
            </button>
          ) : undefined
        }
      />

      {controller.stage === "empty" && (
        <StatusNotice tone="danger" className="justify-center p-8 text-center">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="mb-3 font-display text-3xl font-bold text-white">
              {controller.apparatusLabel} Final Unavailable
            </h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              No gymnast reached this apparatus final from the qualification ranking.
            </p>
          </div>
        </StatusNotice>
      )}

      {controller.stage === "walkover" && winner && (
        <StatusNotice tone="success" className="justify-center p-8 text-center">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="font-display text-3xl font-bold text-white">Automatic Gold Medal</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Only one gymnast qualified for the {controller.apparatusLabel.toLowerCase()} final, so the scoring phase was skipped.
            </p>

            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-amber-500/20 bg-slate-950/60 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{getCountryById(winner.gymnast.countryId).flag}</span>
                  <div>
                    <div className="font-display text-2xl font-bold text-white">
                      {winner.gymnast.name}
                    </div>
                    <div className="text-sm uppercase tracking-widest text-slate-500">
                      {getCountryById(winner.gymnast.countryId).name}
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-amber-300">
                  Gold
                </div>
              </div>
            </div>
          </div>
        </StatusNotice>
      )}

      {controller.stage === "scoring" && (
        <div className="space-y-8">
          <ApparatusFinalStandings
            apparatusLabel={controller.apparatusLabel}
            rankings={controller.rankings}
            isRankIndicatorActive={controller.isRankIndicatorActive}
          />

          <ApparatusFinalScoringPanel
            state={controller.state}
            apparatus={apparatus}
            apparatusLabel={controller.apparatusLabel}
            rankings={controller.rankings}
            getStoredScore={controller.getStoredScore}
            isDnsActive={controller.isDnsActive}
            isDnfActive={controller.isDnfActive}
            getScoreValue={controller.getScoreValue}
            updateScoreDraft={controller.updateScoreDraft}
            onScoreBlur={controller.handleScoreBlur}
            onToggleDns={controller.handleToggleDns}
            isRankIndicatorActive={controller.isRankIndicatorActive}
          />
        </div>
      )}
    </PageShell>
  );
}
