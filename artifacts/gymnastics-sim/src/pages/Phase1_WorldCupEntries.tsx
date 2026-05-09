import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { getCompetitionConfig, getNextRunPhase, getPreviousRunPhase, getRunRoute } from "@/lib/competitionRun";
import { APPARATUS_LABEL, getApparatusForDiscipline } from "@/lib/competition";
import { COUNTRIES, getCountryById } from "@/lib/countries";
import { Apparatus, ApparatusKey, Discipline, Gymnast, Team } from "@/lib/types";
import { cn } from "@/lib/utils";

const createEmptyGymnast = (
  countryId: string,
  index: number,
  discipline: Discipline,
): Gymnast => {
  const apparatus = getApparatusForDiscipline(discipline);
  const primaryApparatus = apparatus[0];

  return {
    id: `${countryId}_WC_${index + 1}_${Date.now()}`,
    name: "",
    countryId,
    apparatus: primaryApparatus === "VT" ? ["VT"] : [primaryApparatus],
  };
};

export default function Phase1_WorldCupEntries() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const config = getCompetitionConfig(state);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [countryToAdd, setCountryToAdd] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  const officialApparatus = useMemo(
    () => [...getApparatusForDiscipline(state.discipline)],
    [state.discipline],
  );

  useEffect(() => {
    if (!config.uiCapabilities.supportsEntryBuilder) {
      setLocation("/");
      return;
    }

    if (Object.keys(state.teams).length > 0) {
      setTeams(state.teams);
      return;
    }

    setTeams({});
  }, [config.uiCapabilities.supportsEntryBuilder, setLocation, state.teams]);

  const selectedCountryIds = useMemo(() => Object.keys(teams), [teams]);
  const availableCountries = useMemo(
    () => COUNTRIES.filter((country) => !selectedCountryIds.includes(country.id)),
    [selectedCountryIds],
  );
  const totalGymnasts = useMemo(
    () => Object.values(teams).reduce((sum, team) => sum + team.gymnasts.length, 0),
    [teams],
  );

  const updateTeam = (countryId: string, updater: (team: Team) => Team) => {
    setTeams((prev) => ({
      ...prev,
      [countryId]: updater(prev[countryId]),
    }));
    setWarning(null);
  };

  const addDelegation = () => {
    if (!countryToAdd) return;

    setTeams((prev) => {
      const existing = prev[countryToAdd];
      if (existing) return prev;

      return {
        ...prev,
        [countryToAdd]: {
          countryId: countryToAdd,
          entryType: "INDIVIDUAL_DELEGATION",
          gymnasts: [createEmptyGymnast(countryToAdd, 0, state.discipline)],
        },
      };
    });
    setCountryToAdd("");
  };

  const removeDelegation = (countryId: string) => {
    setTeams((prev) => {
      const next = { ...prev };
      delete next[countryId];
      return next;
    });
  };

  const addGymnast = (countryId: string) => {
    const team = teams[countryId];
    if (!team || team.gymnasts.length >= (config.entryConstraints.maxGymnastsPerCountry || 4)) {
      return;
    }

    updateTeam(countryId, (currentTeam) => ({
      ...currentTeam,
      gymnasts: [
        ...currentTeam.gymnasts,
        createEmptyGymnast(countryId, currentTeam.gymnasts.length, state.discipline),
      ],
    }));
  };

  const removeGymnast = (countryId: string, gymnastId: string) => {
    updateTeam(countryId, (currentTeam) => ({
      ...currentTeam,
      gymnasts: currentTeam.gymnasts.filter((gymnast) => gymnast.id !== gymnastId),
    }));
  };

  const updateGymnastName = (countryId: string, gymnastId: string, name: string) => {
    updateTeam(countryId, (currentTeam) => ({
      ...currentTeam,
      gymnasts: currentTeam.gymnasts.map((gymnast) =>
        gymnast.id === gymnastId ? { ...gymnast, name } : gymnast),
    }));
  };

  const toggleGymnastApparatus = (
    countryId: string,
    gymnastId: string,
    apparatus: Apparatus,
  ) => {
    updateTeam(countryId, (currentTeam) => ({
      ...currentTeam,
      gymnasts: currentTeam.gymnasts.map((gymnast) => {
        if (gymnast.id !== gymnastId) return gymnast;

        const currentlySelected = gymnast.apparatus.includes(apparatus);
        let nextApparatus = [...gymnast.apparatus];

        if (currentlySelected) {
          nextApparatus = nextApparatus.filter((value) => value !== apparatus);
        } else {
          if (apparatus === "VT") {
            nextApparatus = nextApparatus.filter((value) => value !== "VT*");
          }
          if (apparatus === "VT*") {
            nextApparatus = nextApparatus.filter((value) => value !== "VT");
          }
          nextApparatus.push(apparatus);
        }

        return {
          ...gymnast,
          apparatus: nextApparatus,
        };
      }),
    }));
  };

  const validateEntries = (): string | null => {
    if (selectedCountryIds.length === 0) {
      return "Add at least one delegation before continuing.";
    }

    if (totalGymnasts === 0) {
      return "At least one gymnast entry is required.";
    }

    if (config.entryConstraints.maxGymnastsTotal && totalGymnasts > config.entryConstraints.maxGymnastsTotal) {
      return `World Cup maximum exceeded: ${totalGymnasts}/${config.entryConstraints.maxGymnastsTotal} gymnasts.`;
    }

    for (const team of Object.values(teams)) {
      if (team.gymnasts.length === 0) {
        return `${getCountryById(team.countryId).name} must have at least one gymnast or be removed.`;
      }

      if (team.gymnasts.some((gymnast) => gymnast.name.trim() === "")) {
        return `Every gymnast entry must include a name.`;
      }

      if (team.gymnasts.some((gymnast) => gymnast.apparatus.length === 0)) {
        return `Every gymnast entry must include at least one apparatus.`;
      }

      for (const apparatus of officialApparatus) {
        const competingCount = team.gymnasts.filter((gymnast) =>
          apparatus === "VT"
            ? gymnast.apparatus.includes("VT") || gymnast.apparatus.includes("VT*")
            : gymnast.apparatus.includes(apparatus),
        ).length;

        if (
          config.entryConstraints.maxPerApparatus
          && competingCount > config.entryConstraints.maxPerApparatus
        ) {
          return `${getCountryById(team.countryId).name} exceeds the ${config.entryConstraints.maxPerApparatus}-per-apparatus limit on ${APPARATUS_LABEL[apparatus]}.`;
        }
      }
    }

    return null;
  };

  const handleContinue = () => {
    const validationError = validateEntries();
    if (validationError) {
      setWarning(validationError);
      return;
    }

    dispatch({ type: "SET_COUNTRIES", payload: selectedCountryIds });
    dispatch({ type: "SET_TEAMS", payload: teams });
    dispatch({ type: "SET_MIXED_GROUPS", payload: {} });

    const nextPhase = getNextRunPhase(state);
    if (nextPhase) {
      dispatch({ type: "SET_ACTIVE_PHASE", payload: nextPhase.key });
      setLocation(nextPhase.route);
    }
  };

  const previousPhase = getPreviousRunPhase(state);
  const apparatusControls = officialApparatus.includes("VT")
    ? ["VT", "VT*", ...officialApparatus.filter((apparatus) => apparatus !== "VT")]
    : officialApparatus;

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => setLocation(previousPhase ? getRunRoute(state, previousPhase.key) : "/")}
          className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" /> Back
        </button>
        <div className="text-center">
          <h2 className="mb-1 text-2xl font-display font-bold text-white">WORLD CUP ENTRIES</h2>
          <p className="text-sm text-slate-400">
            Build delegations with up to {config.entryConstraints.maxGymnastsPerCountry} athletes per country and a maximum of {config.entryConstraints.maxPerApparatus} athletes per apparatus.
          </p>
        </div>
        <div className="w-20" />
      </div>

      {warning && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-300">
          {warning}
        </div>
      )}

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-2xl border border-amber-500/15 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Add Delegation</div>
              <h3 className="mt-1 text-xl font-display font-bold text-white">
                Competition entries by country
              </h3>
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold text-amber-400">
                {totalGymnasts}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                / {config.entryConstraints.maxGymnastsTotal} athletes
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={countryToAdd}
              onChange={(event) => setCountryToAdd(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white outline-none transition-colors focus:border-amber-500 sm:flex-1"
            >
              <option value="">Select a country</option>
              {availableCountries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>

            <button
              onClick={addDelegation}
              disabled={!countryToAdd}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-slate-900 px-5 py-3 font-bold uppercase tracking-wide text-amber-300 transition-all hover:border-amber-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add Country
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Limits</div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>Each country may enter up to {config.entryConstraints.maxGymnastsPerCountry} gymnasts total.</p>
            <p>Each country may enter up to {config.entryConstraints.maxPerApparatus} gymnasts per apparatus.</p>
            <p>The current build uses country delegations as the rotation entity for qualification.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        {selectedCountryIds.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center text-slate-500">
            Add the first country delegation to start building the World Cup field.
          </div>
        )}

        {selectedCountryIds.map((countryId) => {
          const team = teams[countryId];
          const country = getCountryById(countryId);

          return (
            <section
              key={countryId}
              className="glass-panel overflow-hidden rounded-2xl border border-white/10"
            >
              <div className="flex flex-col gap-4 border-b border-white/10 bg-slate-900/70 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{country.flag}</span>
                  <div>
                    <h3 className="text-2xl font-display font-bold text-white">{country.name}</h3>
                    <p className="text-sm text-slate-400">
                      {team.gymnasts.length}/{config.entryConstraints.maxGymnastsPerCountry} athlete entries
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => addGymnast(countryId)}
                    disabled={team.gymnasts.length >= (config.entryConstraints.maxGymnastsPerCountry || 4)}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-violet-200 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Gymnast
                  </button>

                  <button
                    onClick={() => removeDelegation(countryId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-red-200 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {team.gymnasts.map((gymnast, gymnastIndex) => (
                  <div
                    key={gymnast.id}
                    className="rounded-2xl border border-white/5 bg-slate-950/30 p-4"
                  >
                    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr_auto] xl:items-start">
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                          Athlete {gymnastIndex + 1}
                        </div>
                        <input
                          value={gymnast.name}
                          onChange={(event) =>
                            updateGymnastName(countryId, gymnast.id, event.target.value)
                          }
                          placeholder="Gymnast name"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-white outline-none transition-colors focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                          Apparatus
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {apparatusControls.map((apparatus) => {
                            const isSelected = gymnast.apparatus.includes(apparatus as Apparatus);

                            return (
                              <button
                                key={`${gymnast.id}_${apparatus}`}
                                type="button"
                                onClick={() =>
                                  toggleGymnastApparatus(countryId, gymnast.id, apparatus as Apparatus)
                                }
                                className={cn(
                                  "rounded-xl border-2 px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors",
                                  isSelected
                                    ? "border-amber-500 bg-amber-500/20 text-amber-300"
                                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                                )}
                                title={apparatus === "VT*" ? "Two vaults entered for apparatus final qualification" : APPARATUS_LABEL[apparatus as ApparatusKey] || apparatus}
                              >
                                {apparatus}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end xl:justify-start">
                        <button
                          type="button"
                          onClick={() => removeGymnast(countryId, gymnast.id)}
                          disabled={team.gymnasts.length === 1}
                          className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-300 transition-colors hover:border-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove athlete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 flex justify-center">
        <button
          onClick={handleContinue}
          className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-10 py-4 text-lg font-bold uppercase tracking-wide text-slate-950 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-95"
        >
          Continue to Rotation
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
