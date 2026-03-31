import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { COUNTRIES } from "@/lib/countries";
import { generateQuickSetupSnapshot } from "@/lib/quickSetup";
import { Spinner } from "@/components/ui/spinner";
import { clsx } from "clsx";

export default function Phase1_Teams() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [selected, setSelected] = useState<string[]>(state.selectedCountries || []);
  const [quickSetupError, setQuickSetupError] = useState<string | null>(null);
  const [isGeneratingQuickSetup, setIsGeneratingQuickSetup] = useState(false);

  useEffect(() => {
    // Ao voltar para esta fase, reaproveita a selecao ja salva no contexto.
    if (state.phase > 1) {
      setSelected(state.selectedCountries);
    }
  }, [state.selectedCountries, state.phase]);

  const toggleCountry = (id: string) => {
    // A qualificacao por equipes trabalha com exatamente 12 paises.
    if (selected.includes(id)) {
      setSelected(selected.filter(c => c !== id));
    } else {
      if (selected.length < 12) {
        setSelected([...selected, id]);
      }
    }
  };

  const handleContinue = () => {
    // So avanca quando o quadro de equipes esta completo.
    if (selected.length === 12) {
      dispatch({ type: 'SET_COUNTRIES', payload: selected });
      if (state.phase < 2) {
        dispatch({ type: 'SET_PHASE', payload: 2 });
      }
      setLocation("/roster");
    }
  };

  const handleQuickSetup = async () => {
    const hasExistingSimulation =
      state.phase > 1
      || state.selectedCountries.length > 0
      || Object.keys(state.teams).length > 0
      || Object.keys(state.mixedGroups).length > 0
      || Object.keys(state.scores).length > 0
      || Object.keys(state.dns).length > 0;

    if (
      hasExistingSimulation
      && !window.confirm("Replace the current setup and clear existing scores?")
    ) {
      return;
    }

    setQuickSetupError(null);
    setIsGeneratingQuickSetup(true);

    try {
      const snapshot = await generateQuickSetupSnapshot();
      dispatch({ type: 'HYDRATE_SIMULATION', payload: snapshot });
      setLocation("/scoring");
    } catch (error) {
      setQuickSetupError(
        error instanceof Error
          ? error.message
          : "Unable to generate quick setup data. Please try again.",
      );
    } finally {
      setIsGeneratingQuickSetup(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-display font-bold text-white mb-3 text-glow">TEAM SELECTION</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Select the 12 nations that have qualified a full 5-member team for the Olympic Games.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 md:p-8 mb-8">
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-display font-bold text-amber-400">
              {selected.length}<span className="text-xl text-slate-500">/12</span>
            </div>
            <div className="text-sm font-medium text-slate-400 uppercase tracking-widest">
              Teams Selected
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={handleQuickSetup}
              disabled={isGeneratingQuickSetup}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-slate-900/80 border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:bg-slate-800"
            >
              {isGeneratingQuickSetup ? (
                <>
                  <Spinner className="w-5 h-5" /> Generating
                </>
              ) : (
                "Quick Setup"
              )}
            </button>
            <button
              onClick={handleContinue}
              disabled={selected.length !== 12 || isGeneratingQuickSetup}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-gold-gradient text-slate-950 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-95"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 text-sm">
          <p className="font-semibold uppercase tracking-wider text-amber-400">Quick Setup</p>
          <p className="text-slate-300">
            Auto-generate 12 teams, 8 mixed groups, subdivision draw, and internal apparatus order,
            then jump straight to scoring.
          </p>
          {quickSetupError && (
            <p className="text-red-400">{quickSetupError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {COUNTRIES.map((country) => {
            const isSelected = selected.includes(country.id);
            const isDisabled = !isSelected && selected.length >= 12;

            return (
              <motion.button
                key={country.id}
                whileHover={!isDisabled ? { scale: 1.05 } : {}}
                whileTap={!isDisabled ? { scale: 0.95 } : {}}
                onClick={() => toggleCountry(country.id)}
                disabled={isDisabled}
                className={clsx(
                  "relative p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border-2 text-left",
                  isSelected 
                    ? "bg-slate-800/80 border-amber-500 shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800",
                  isDisabled && "opacity-40 cursor-not-allowed hover:border-slate-800"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-slate-950" />
                  </div>
                )}
                <span className="text-4xl drop-shadow-md">{country.flag}</span>
                <span className={clsx(
                  "text-xs font-semibold text-center uppercase tracking-wide",
                  isSelected ? "text-amber-400" : "text-slate-300"
                )}>
                  {country.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
