import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, AlertCircle, Save } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { getCompetitionConfig, getNextRunPhase, getPreviousRunPhase, getRunRoute } from "@/lib/competitionRun";
import { APPARATUS_LABEL, getApparatusForDiscipline } from "@/lib/competition";
import { getCountryById } from "@/lib/countries";
import { ApparatusKey, Team } from "@/lib/types";
import { clsx } from "clsx";
import {
  createRosterGymnast,
  getTeamAssignmentStatus,
  getTeamStandByGymnast,
  getTeamTitularGymnasts,
  isTitularOnApparatus,
  normalizeTeamRoster,
  REDUCED_TEAM_MEMBER_COUNT,
  shouldHideIdleTeamGymnast,
  STANDARD_TEAM_MEMBER_COUNT,
} from "@/lib/teamRoster";

const cloneTeam = (team: Team): Team => ({
  ...team,
  gymnasts: team.gymnasts.map((gymnast) => ({
    ...gymnast,
    apparatus: [...gymnast.apparatus],
    teamAssignments: gymnast.teamAssignments ? { ...gymnast.teamAssignments } : undefined,
  })),
});

export default function Phase2_TeamRoster() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const config = getCompetitionConfig(state);
  const selectedCountryCount = config.entryConstraints.selectedCountryCount || 12;
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [warning, setWarning] = useState<string | null>(null);

  const officialApparatus = useMemo(
    () => [...getApparatusForDiscipline(state.discipline)],
    [state.discipline],
  );
  const apparatusControls = officialApparatus.includes("VT")
    ? ["VT", "VT*", ...officialApparatus.filter((apparatus) => apparatus !== "VT")]
    : [...officialApparatus];

  useEffect(() => {
    if (state.selectedCountries.length !== selectedCountryCount) {
      setLocation("/teams");
      return;
    }

    if (Object.keys(state.teams).length === 0) {
      const initialTeams: Record<string, Team> = {};
      state.selectedCountries.forEach((countryId) => {
        initialTeams[countryId] = {
          countryId,
          rosterFormat: STANDARD_TEAM_MEMBER_COUNT,
          gymnasts: Array.from({ length: STANDARD_TEAM_MEMBER_COUNT }, (_, index) =>
            createRosterGymnast(countryId, index, state.discipline),
          ),
        };
      });
      setTeams(initialTeams);
      return;
    }

    setTeams(state.teams);
  }, [selectedCountryCount, setLocation, state.discipline, state.selectedCountries, state.teams]);

  if (state.selectedCountries.length === 0 || Object.keys(teams).length === 0) return null;

  const currentCountryId = state.selectedCountries[currentTeamIdx];
  const currentTeam = teams[currentCountryId];
  const country = getCountryById(currentCountryId);
  const rosterFormat = currentTeam.rosterFormat || STANDARD_TEAM_MEMBER_COUNT;

  const titularCounts = officialApparatus.reduce<Record<ApparatusKey, number>>((accumulator, apparatus) => {
    accumulator[apparatus] = getTeamTitularGymnasts(currentTeam, apparatus).length;
    return accumulator;
  }, {} as Record<ApparatusKey, number>);

  const hiddenGymnastIds = new Set(
    currentTeam.gymnasts
      .filter((gymnast) => shouldHideIdleTeamGymnast(currentTeam, gymnast, state.discipline))
      .map((gymnast) => gymnast.id),
  );

  const setCurrentTeam = (nextTeam: Team) => {
    setTeams({
      ...teams,
      [currentCountryId]: normalizeTeamRoster(nextTeam, state.discipline),
    });
    setWarning(null);
  };

  const updateGymnastName = (idx: number, name: string) => {
    const nextTeam = cloneTeam(currentTeam);
    nextTeam.gymnasts[idx].name = name;
    setCurrentTeam(nextTeam);
  };

  const updateRosterFormat = (nextFormat: 3 | 5) => {
    if (rosterFormat === nextFormat) return;

    const nextTeam = cloneTeam(currentTeam);
    nextTeam.rosterFormat = nextFormat;
    setCurrentTeam(nextTeam);
  };

  const toggleTitularAssignment = (gIdx: number, apparatus: ApparatusKey) => {
    if (rosterFormat === REDUCED_TEAM_MEMBER_COUNT) return;

    const nextTeam = cloneTeam(currentTeam);
    const gymnast = nextTeam.gymnasts[gIdx];
    const currentStatus = getTeamAssignmentStatus(gymnast, apparatus);

    if (currentStatus === "titular") {
      gymnast.teamAssignments![apparatus] = "inactive";
      setCurrentTeam(nextTeam);
      return;
    }

    if (titularCounts[apparatus] >= 4) return;

    gymnast.teamAssignments![apparatus] = "titular";
    setCurrentTeam(nextTeam);
  };

  const toggleStandByAssignment = (gIdx: number, apparatus: ApparatusKey) => {
    if (rosterFormat !== STANDARD_TEAM_MEMBER_COUNT || titularCounts[apparatus] < 4) return;

    const nextTeam = cloneTeam(currentTeam);
    const gymnast = nextTeam.gymnasts[gIdx];
    const currentStatus = getTeamAssignmentStatus(gymnast, apparatus);
    const currentStandBy = getTeamStandByGymnast(nextTeam, apparatus);

    if (currentStatus === "standby") {
      gymnast.teamAssignments![apparatus] = "inactive";
      setCurrentTeam(nextTeam);
      return;
    }

    if (currentStatus === "titular") return;
    if (currentStandBy && currentStandBy.id !== gymnast.id) return;

    gymnast.teamAssignments![apparatus] = "standby";
    setCurrentTeam(nextTeam);
  };

  const toggleDoubleVault = (gIdx: number) => {
    const nextTeam = cloneTeam(currentTeam);
    const gymnast = nextTeam.gymnasts[gIdx];
    if (!isTitularOnApparatus(gymnast, "VT")) return;

    gymnast.apparatus = gymnast.apparatus.includes("VT*")
      ? gymnast.apparatus.filter((apparatus) => apparatus !== "VT*").concat("VT")
      : gymnast.apparatus.filter((apparatus) => apparatus !== "VT").concat("VT*");

    setCurrentTeam(nextTeam);
  };

  const validateTeam = () => {
    const missing = officialApparatus
      .filter((apparatus) => titularCounts[apparatus] < 3)
      .map((apparatus) => `${APPARATUS_LABEL[apparatus]} (${apparatus})`);

    const requiredGymnasts = currentTeam.gymnasts.filter((gymnast, index) => (
      rosterFormat === REDUCED_TEAM_MEMBER_COUNT
        ? index < REDUCED_TEAM_MEMBER_COUNT
        : !hiddenGymnastIds.has(gymnast.id)
    ));

    if (requiredGymnasts.some((gymnast) => gymnast.name.trim() === "")) {
      return rosterFormat === REDUCED_TEAM_MEMBER_COUNT
        ? "Please enter names for the 3 active gymnasts."
        : "Please enter names for all visible team members.";
    }

    if (missing.length > 0) {
      return `Minimum 3 titular gymnasts required per apparatus. Missing on: ${missing.join(", ")}`;
    }

    return null;
  };

  const handleNext = () => {
    const err = validateTeam();
    if (err) {
      setWarning(err);
      return;
    }

    dispatch({ type: "SET_TEAMS", payload: teams });

    if (currentTeamIdx < state.selectedCountries.length - 1) {
      setCurrentTeamIdx(currentTeamIdx + 1);
      return;
    }

    const nextPhase = getNextRunPhase(state);
    if (nextPhase) {
      dispatch({ type: "SET_ACTIVE_PHASE", payload: nextPhase.key });
      setLocation(nextPhase.route);
    }
  };

  const handlePrev = () => {
    if (currentTeamIdx > 0) {
      setCurrentTeamIdx(currentTeamIdx - 1);
      setWarning(null);
      return;
    }

    const previousPhase = getPreviousRunPhase(state);
    setLocation(previousPhase ? getRunRoute(state, previousPhase.key) : "/teams");
  };

  const coverageStats = officialApparatus.map((apparatus) => ({
    id: apparatus,
    label: apparatus,
    count: titularCounts[apparatus],
  }));

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={handlePrev} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-1">TEAM ROSTERS</h2>
          <p className="text-sm text-amber-400 tracking-widest uppercase">Team {currentTeamIdx + 1} of {state.selectedCountries.length}</p>
        </div>
        <div className="w-20" />
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border-t-4 border-t-amber-500">
        <div className="bg-slate-900/80 p-6 flex flex-col gap-5 border-b border-white/10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <span className="text-6xl drop-shadow-lg">{country.flag}</span>
              <div>
                <h3 className="text-3xl font-display font-bold text-white tracking-wide">{country.name}</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Configure a 5-member roster or switch to the reduced 3-member format.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-slate-950/60 p-2">
              {([
                { id: STANDARD_TEAM_MEMBER_COUNT, label: "5 Members" },
                { id: REDUCED_TEAM_MEMBER_COUNT, label: "3 Members" },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateRosterFormat(option.id)}
                  className={clsx(
                    "rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors",
                    rosterFormat === option.id
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:bg-slate-800",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
            {rosterFormat === REDUCED_TEAM_MEMBER_COUNT
              ? "Reduced format locks gymnasts 1-3 as titulares on every apparatus and permanently disables gymnasts 4-5."
              : "Standard format allows up to 4 titulares plus 1 Stand By per apparatus. Fully idle member cards auto-hide in a 4-4-4 setup."}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          <div className="grid grid-cols-12 gap-4 pb-2 border-b border-white/5 text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">Gymnast Name</div>
            <div className="col-span-6 flex justify-between pr-4">
              <span>Apparatus Assignments</span>
            </div>
          </div>

          {currentTeam.gymnasts.map((gymnast, idx) => {
            const rowDisabled = rosterFormat === REDUCED_TEAM_MEMBER_COUNT && idx >= REDUCED_TEAM_MEMBER_COUNT;
            const rowHidden = hiddenGymnastIds.has(gymnast.id);

            return (
              <motion.div
                key={gymnast.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={clsx(
                  "grid grid-cols-12 gap-4 items-center bg-slate-800/30 p-2 rounded-xl border border-white/5 hover:bg-slate-800/50 transition-colors",
                  rowDisabled && "opacity-45",
                  rowHidden && "hidden",
                )}
              >
                <div className="col-span-1 text-center font-display font-bold text-amber-500/50 text-xl">
                  {idx + 1}
                </div>
                <div className="col-span-12 sm:col-span-5">
                  <input
                    type="text"
                    value={gymnast.name}
                    disabled={rowDisabled}
                    onChange={(event) => updateGymnastName(idx, event.target.value)}
                    placeholder={`Gymnast ${idx + 1} Name`}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                  />
                  {rowDisabled && (
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Disabled in 3-member format
                    </p>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-6 flex justify-between items-start gap-1 overflow-x-auto no-scrollbar">
                  {apparatusControls.map((control) => {
                    if (control === "VT*") {
                      const vtTitular = isTitularOnApparatus(gymnast, "VT");
                      const vtStarSelected = gymnast.apparatus.includes("VT*");

                      return (
                        <div key={`${gymnast.id}_VT*`} className="flex flex-col gap-1 min-w-[4rem]">
                          <button
                            type="button"
                            disabled={!vtTitular || rowDisabled}
                            onClick={() => toggleDoubleVault(idx)}
                            className={clsx(
                              "px-3 py-2 rounded-lg font-bold text-sm min-w-[4rem] transition-all duration-200 border-2",
                              vtStarSelected
                                ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[inset_0_0_10px_rgba(212,175,55,0.2)]"
                                : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300",
                              (!vtTitular || rowDisabled) && "opacity-30 cursor-not-allowed hover:border-slate-700",
                            )}
                            title="Two vaults for Event Final qualification"
                          >
                            VT*
                          </button>
                        </div>
                      );
                    }

                    const apparatus = control as ApparatusKey;
                    const currentStatus = getTeamAssignmentStatus(gymnast, apparatus);
                    const isTitular = currentStatus === "titular";
                    const isStandBy = currentStatus === "standby";
                    const vtStarSelected = apparatus === "VT" && gymnast.apparatus.includes("VT*");
                    const showTitularAsSelected = apparatus === "VT" ? isTitular && !vtStarSelected : isTitular;
                    const titularLimitReached =
                      rosterFormat === STANDARD_TEAM_MEMBER_COUNT
                      && titularCounts[apparatus] >= 4
                      && !isTitular;
                    const showStandByButton = rosterFormat === STANDARD_TEAM_MEMBER_COUNT && titularLimitReached;

                    return (
                      <div key={`${gymnast.id}_${apparatus}`} className="flex flex-col gap-1 min-w-[4rem]">
                        <button
                          type="button"
                          onClick={() => toggleTitularAssignment(idx, apparatus)}
                          disabled={rowDisabled || rosterFormat === REDUCED_TEAM_MEMBER_COUNT || titularLimitReached}
                          className={clsx(
                            "px-3 py-2 rounded-lg font-bold text-sm min-w-[4rem] transition-all duration-200 border-2",
                            showTitularAsSelected
                              ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[inset_0_0_10px_rgba(212,175,55,0.2)]"
                              : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300",
                            (rowDisabled || rosterFormat === REDUCED_TEAM_MEMBER_COUNT || titularLimitReached)
                              && !showTitularAsSelected
                              && "opacity-30 cursor-not-allowed hover:border-slate-700",
                          )}
                        >
                          {apparatus}
                        </button>

                        {showStandByButton && (
                          <button
                            type="button"
                            onClick={() => toggleStandByAssignment(idx, apparatus)}
                            className={clsx(
                              "rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                              isStandBy
                                ? "border-sky-400/50 bg-sky-500/20 text-sky-200"
                                : "border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-400/40 hover:text-sky-200",
                            )}
                          >
                            Stand By
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-slate-900/80 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/10">
          <div className="flex gap-4">
            {coverageStats.map((stat) => (
              <div key={stat.id} className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{stat.label}</span>
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
                  stat.count < 3 ? "border-red-500/50 bg-red-500/10 text-red-400" :
                  stat.count === 4 ? "border-amber-500/50 bg-amber-500/10 text-amber-400" :
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
                )}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            <AnimatePresence>
              {warning && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 max-w-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{warning}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-wide transition-all duration-300 bg-gold-gradient text-slate-950 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-95"
            >
              {currentTeamIdx === state.selectedCountries.length - 1 ? (
                <>Save & Finish <Save className="w-5 h-5" /></>
              ) : (
                <>Next Team <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
