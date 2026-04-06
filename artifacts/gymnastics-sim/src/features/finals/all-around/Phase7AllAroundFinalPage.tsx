import { ChevronLeft, RotateCcw, ShieldAlert, Trophy } from "lucide-react";

import { PageHero } from "@/components/simulation/layout/PageHero";
import { PageShell } from "@/components/simulation/layout/PageShell";
import { StatusNotice } from "@/components/simulation/status/StatusNotice";
import { getCountryById } from "@/lib/countries";

import { AllAroundRotationPanel } from "./components/AllAroundRotationPanel";
import { AllAroundSetupDialog } from "./components/AllAroundSetupDialog";
import { AllAroundStandings } from "./components/AllAroundStandings";
import { useAllAroundFinalController } from "./hooks/useAllAroundFinalController";

export default function Phase7AllAroundFinalPage() {
  const controller = useAllAroundFinalController();

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
            <h2 className="mb-3 font-display text-3xl font-bold text-white">AA Final Locked</h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              {controller.qualificationCompletion.message}
            </p>
            {controller.qualificationCompletion.missingRoutineCount > 0 && (
              <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-rose-300">
                {controller.qualificationCompletion.missingRoutineCount} routines still missing
              </p>
            )}
          </div>
        </StatusNotice>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <AllAroundSetupDialog
        open={controller.stage === "substitution"}
        qualified={controller.qualificationPool.qualified}
        reserves={controller.qualificationPool.reserves}
        replacementChoice={controller.replacementChoice}
        onReplacementChoice={controller.setReplacementChoice}
        selectedReplacementSlots={controller.selectedReplacementSlots}
        replacementLimit={controller.replacementLimit}
        onToggleSlot={controller.toggleReplacementSlot}
        setupError={controller.setupError}
        onConfirm={controller.handleConfirmSlots}
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
          <span>{controller.completedRoutineCount}/{controller.slots.length * 4 || 4} routines done</span>
        </div>
      </div>

      <PageHero
        title="INDIVIDUAL ALL-AROUND FINAL"
        description="Fixed Olympic-style rotation order with a live all-around leaderboard and apparatus comparison."
      />

      {controller.stage === "empty" && (
        <StatusNotice tone="danger" className="justify-center p-8 text-center">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="mb-3 font-display text-3xl font-bold text-white">AA Final Unavailable</h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              No gymnast reached the all-around final from the qualification ranking.
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
              Only one gymnast qualified for the all-around final, so the scoring phase was skipped.
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

      {controller.stage !== "empty" && controller.stage !== "walkover" && (
        <div className="space-y-8">
          <AllAroundStandings
            rankings={controller.rankings}
            activeTab={controller.activeTab}
            onTabChange={controller.setActiveTab}
            isRankIndicatorActive={controller.isRankIndicatorActive}
          />

          <AllAroundRotationPanel
            state={controller.state}
            rankings={controller.rankings}
            activeRotation={controller.activeRotation}
            onRotationChange={controller.setActiveRotation}
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
