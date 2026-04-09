import { ChevronLeft, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { useLocation } from "wouter";

import { PageHero } from "@/components/simulation/layout/PageHero";
import { PageShell } from "@/components/simulation/layout/PageShell";
import { StatusNotice } from "@/components/simulation/status/StatusNotice";
import { useSimulation } from "@/context/SimulationContext";
import { FinalEntryCard } from "@/features/finals/shared/components/FinalEntryCard";
import { getFinalsAvailability } from "@/features/finals/shared/selectors/finalsAvailabilitySelectors";

export default function Phase7FinalsHubPage() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const finalsAvailability = getFinalsAvailability(state);

  const enterFinal = (route: string, isEnabled: boolean) => {
    if (!isEnabled) return;
    if (state.phase < 7) {
      dispatch({ type: "SET_PHASE", payload: 7 });
    }
    setLocation(route);
  };

  return (
    <PageShell width="wide" className="max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLocation("/results")}
          className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" /> Back to Results
        </button>
      </div>

      <PageHero
        align="center"
        icon={<Trophy className="h-8 w-8 text-slate-950" />}
        title="PHASE 7 FINALS"
        description="Finals are now grouped into a single phase. You can start or resume each final in any order."
      />

      {!finalsAvailability.qualificationCompletion.isComplete && (
        <StatusNotice tone="danger" className="mb-8">
          <div>
            <div className="flex items-center gap-2 font-bold uppercase tracking-widest">
              <ShieldAlert className="h-5 w-5" />
              Qualification Incomplete
            </div>
            <p className="mt-2 text-sm text-rose-100/80">
              {finalsAvailability.qualificationCompletion.message}
            </p>
          </div>
        </StatusNotice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <FinalEntryCard
          icon={<Users className="h-6 w-6" />}
          title="7.1 Team Final"
          description={finalsAvailability.teamFinalMessage}
          enabled={finalsAvailability.canOpenTeamFinal}
          stats={[
            `${finalsAvailability.teamFinalPool.qualified.length} qualified teams`,
            `${finalsAvailability.teamFinalPool.reserves.length} reserve teams`,
            state.finals.teamFinal.slots.length === 8 ? "In progress" : "Not started",
          ]}
          onClick={() => enterFinal("/finals/team", finalsAvailability.canOpenTeamFinal)}
        />

        <FinalEntryCard
          icon={<Medal className="h-6 w-6" />}
          title="7.2 Individual All-Around"
          description={finalsAvailability.allAroundFinalMessage}
          enabled={finalsAvailability.canOpenAllAroundFinal}
          stats={[
            `${finalsAvailability.allAroundFinalPool.qualified.length} qualified gymnasts`,
            `${finalsAvailability.allAroundFinalPool.reserves.length} reserves`,
            finalsAvailability.allAroundFinalPool.qualified.length === 1
              ? "Automatic gold"
              : state.finals.allAroundFinal.slots.length > 0
                ? "In progress"
                : "Not started",
          ]}
          onClick={() => enterFinal("/finals/all-around", finalsAvailability.canOpenAllAroundFinal)}
        />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-slate-300" />
          <h3 className="font-display text-xl font-bold text-white">7.3 Event Finals</h3>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          {(["VT", "UB", "BB", "FX"] as const).map((apparatus) => {
            const final = finalsAvailability.apparatusFinals[apparatus];

            return (
              <FinalEntryCard
                key={apparatus}
                icon={<Medal className="h-6 w-6" />}
                title={`${final.code} ${final.label}`}
                description={final.message}
                enabled={final.canOpen}
                stats={[
                  `${final.pool.qualified.length} finalists`,
                  `${final.pool.reserves.length} reserves`,
                  final.pool.qualified.length === 1
                    ? "Automatic gold"
                    : final.isComplete
                      ? "Completed"
                      : final.rankings.length > 0
                        ? "In progress"
                        : "Not started",
                ]}
                onClick={() => enterFinal(final.route, final.canOpen)}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <FinalEntryCard
          icon={<Trophy className="h-6 w-6" />}
          title="7.4 Medal Summary"
          description={
            finalsAvailability.canOpenMedalSummary
              ? "All finals are complete. Open the medal table for countries and gymnasts."
              : "Unlocked after Team Final, All-Around Final and all four apparatus finals are completed."
          }
          enabled={finalsAvailability.canOpenMedalSummary}
          stats={[
            `${finalsAvailability.finalsCompletion.completedFinals}/${finalsAvailability.finalsCompletion.totalFinals} finals completed`,
            `${finalsAvailability.finalsCompletion.apparatusFinalsComplete}/4 apparatus finals done`,
            finalsAvailability.canOpenMedalSummary ? "Unlocked" : "Locked",
          ]}
          onClick={() => enterFinal("/finals/medals", finalsAvailability.canOpenMedalSummary)}
        />
      </div>
    </PageShell>
  );
}
