import { useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Medal, ShieldAlert, Trophy, Users } from "lucide-react";
import { clsx } from "clsx";
import { useSimulation } from "@/context/SimulationContext";
import { getAllAroundFinalQualificationPool } from "@/lib/allAroundFinal";
import { getQualificationCompletionStatus, getTeamFinalQualificationPool } from "@/lib/teamFinal";

export default function Phase7_FinalsHub() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const teamFinalPool = useMemo(
    () => getTeamFinalQualificationPool(state),
    [state],
  );

  const allAroundPool = useMemo(
    () => getAllAroundFinalQualificationPool(state),
    [state],
  );

  const enterFinal = (route: string, isEnabled: boolean) => {
    if (!isEnabled) return;
    if (state.phase < 7) {
      dispatch({ type: "SET_PHASE", payload: 7 });
    }
    setLocation(route);
  };

  const canOpenTeamFinal = qualificationCompletion.isComplete && teamFinalPool.qualified.length >= 8;
  const canOpenAllAroundFinal = qualificationCompletion.isComplete && allAroundPool.qualified.length > 0;

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => setLocation("/results")}
          className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" /> Back to Results
        </button>
      </div>

      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient shadow-[0_0_30px_rgba(212,175,55,0.35)]">
          <Trophy className="h-8 w-8 text-slate-950" />
        </div>
        <h2 className="font-display text-4xl font-bold text-white text-glow">
          PHASE 7 FINALS
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-slate-400">
          Finals are now grouped into a single phase. You can start or resume each final in any order.
        </p>
      </div>

      {!qualificationCompletion.isComplete && (
        <div className="mb-8 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold uppercase tracking-widest">Qualification Incomplete</div>
              <p className="mt-2 text-sm text-rose-100/80">{qualificationCompletion.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => enterFinal("/finals/team", canOpenTeamFinal)}
          disabled={!canOpenTeamFinal}
          className={clsx(
            "rounded-3xl border p-6 text-left transition-all",
            canOpenTeamFinal
              ? "border-amber-500/30 bg-slate-900/60 hover:border-amber-400 hover:bg-slate-900/80"
              : "cursor-not-allowed border-white/10 bg-slate-900/30 opacity-80",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-amber-400" />
                <div className="font-display text-2xl font-bold text-white">7.1 Team Final</div>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                {canOpenTeamFinal
                  ? `Top 8 confirmed. Reserves: ${teamFinalPool.reserves.map((row) => row.status).join(", ") || "none"}.`
                  : qualificationCompletion.isComplete
                    ? `Team Final needs 8 qualified teams. Currently available: ${teamFinalPool.qualified.length}.`
                    : qualificationCompletion.message}
              </p>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 text-slate-500" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
            <span>{teamFinalPool.qualified.length} qualified teams</span>
            <span>{teamFinalPool.reserves.length} reserve teams</span>
            <span>{state.finals.teamFinal.slots.length === 8 ? "In progress" : "Not started"}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => enterFinal("/finals/all-around", canOpenAllAroundFinal)}
          disabled={!canOpenAllAroundFinal}
          className={clsx(
            "rounded-3xl border p-6 text-left transition-all",
            canOpenAllAroundFinal
              ? "border-amber-500/30 bg-slate-900/60 hover:border-amber-400 hover:bg-slate-900/80"
              : "cursor-not-allowed border-white/10 bg-slate-900/30 opacity-80",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Medal className="h-6 w-6 text-amber-400" />
                <div className="font-display text-2xl font-bold text-white">
                  7.2 Individual All-Around
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                {canOpenAllAroundFinal
                  ? `${allAroundPool.qualified.length} finalists available. Reserves: ${allAroundPool.reserves.map((row) => row.status).join(", ") || "none"}.`
                  : qualificationCompletion.message}
              </p>
            </div>
            <ChevronRight className="mt-1 h-5 w-5 text-slate-500" />
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
            <span>{allAroundPool.qualified.length} qualified gymnasts</span>
            <span>{allAroundPool.reserves.length} reserves</span>
            <span>
              {allAroundPool.qualified.length === 1
                ? "Automatic gold"
                : state.finals.allAroundFinal.slots.length > 0
                  ? "In progress"
                  : "Not started"}
            </span>
          </div>
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-slate-300" />
          <h3 className="font-display text-xl font-bold text-white">7.3 Event Finals</h3>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          The apparatus finals are already grouped in Phase 7, but their scoring screens have not been implemented in this step yet.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { code: "7.3.1", label: "Vault (VT)" },
            { code: "7.3.2", label: "Uneven Bars (UB)" },
            { code: "7.3.3", label: "Balance Beam (BB)" },
            { code: "7.3.4", label: "Floor Exercise (FX)" },
          ].map((final) => (
            <div
              key={final.code}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {final.code}
              </div>
              <div className="mt-2 font-semibold text-white">{final.label}</div>
              <div className="mt-3 inline-flex rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Coming soon
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
