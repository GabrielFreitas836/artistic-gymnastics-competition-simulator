import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, AlertCircle, Save } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { getCountryById } from "@/lib/countries";
import { Team, Gymnast, Apparatus } from "@/lib/types";
import { clsx } from "clsx";

const APPARATUS_LIST: Apparatus[] = ['VT', 'VT*', 'UB', 'BB', 'FX'];

export default function Phase2_TeamRoster() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (state.selectedCountries.length !== 12) {
      setLocation("/teams");
      return;
    }

    // Initialize teams if not exist
    if (Object.keys(state.teams).length === 0) {
      const initialTeams: Record<string, Team> = {};
      state.selectedCountries.forEach(cId => {
        initialTeams[cId] = {
          countryId: cId,
          gymnasts: Array(5).fill(null).map((_, i) => ({
            id: `${cId}_G${i+1}`,
            name: '',
            countryId: cId,
            apparatus: []
          }))
        };
      });
      setTeams(initialTeams);
    } else {
      setTeams(state.teams);
    }
  }, [state.selectedCountries, state.teams, setLocation]);

  if (state.selectedCountries.length === 0 || Object.keys(teams).length === 0) return null;

  const currentCountryId = state.selectedCountries[currentTeamIdx];
  const currentTeam = teams[currentCountryId];
  const country = getCountryById(currentCountryId);

  // Count apparatus usage for current team
  const appCounts = { VT: 0, 'VT*': 0, UB: 0, BB: 0, FX: 0 };
  currentTeam.gymnasts.forEach(g => {
    g.apparatus.forEach(app => {
      appCounts[app as keyof typeof appCounts]++;
    });
  });
  // VT and VT* combine for the max 4 limit calculation
  const totalVaults = appCounts['VT'] + appCounts['VT*'];

  const updateGymnastName = (idx: number, name: string) => {
    const newTeams = { ...teams };
    newTeams[currentCountryId].gymnasts[idx].name = name;
    setTeams(newTeams);
    setWarning(null);
  };

  const toggleApparatus = (gIdx: number, app: Apparatus) => {
    const newTeams = { ...teams };
    const gymnast = newTeams[currentCountryId].gymnasts[gIdx];
    
    if (gymnast.apparatus.includes(app)) {
      // Remove
      gymnast.apparatus = gymnast.apparatus.filter(a => a !== app);
    } else {
      // Add logic with restrictions
      if (app === 'VT' && gymnast.apparatus.includes('VT*')) {
        gymnast.apparatus = gymnast.apparatus.filter(a => a !== 'VT*');
      }
      if (app === 'VT*' && gymnast.apparatus.includes('VT')) {
        gymnast.apparatus = gymnast.apparatus.filter(a => a !== 'VT');
      }

      // Check max limits
      if ((app === 'VT' || app === 'VT*') && totalVaults >= 4 && !gymnast.apparatus.some(a=>a==='VT'||a==='VT*')) {
        return; // Max hit
      }
      if (app !== 'VT' && app !== 'VT*' && appCounts[app] >= 4) {
        return; // Max hit
      }

      gymnast.apparatus.push(app);
    }
    setTeams(newTeams);
    setWarning(null);
  };

  const validateTeam = () => {
    const missing = [];
    if (totalVaults < 3) missing.push('Vault (VT)');
    if (appCounts['UB'] < 3) missing.push('Uneven Bars (UB)');
    if (appCounts['BB'] < 3) missing.push('Balance Beam (BB)');
    if (appCounts['FX'] < 3) missing.push('Floor Exercise (FX)');
    
    const unnamed = currentTeam.gymnasts.some(g => g.name.trim() === '');
    if (unnamed) return "Please enter names for all 5 gymnasts.";

    if (missing.length > 0) {
      return `Minimum 3 gymnasts required per apparatus. Missing on: ${missing.join(', ')}`;
    }
    return null;
  };

  const handleNext = () => {
    const err = validateTeam();
    if (err) {
      setWarning(err);
      return;
    }

    dispatch({ type: 'SET_TEAMS', payload: teams });

    if (currentTeamIdx < 11) {
      setCurrentTeamIdx(currentTeamIdx + 1);
    } else {
      if (state.phase < 3) dispatch({ type: 'SET_PHASE', payload: 3 });
      setLocation("/mixed-groups");
    }
  };

  const handlePrev = () => {
    if (currentTeamIdx > 0) {
      setCurrentTeamIdx(currentTeamIdx - 1);
      setWarning(null);
    } else {
      setLocation("/teams");
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={handlePrev} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-1">TEAM ROSTERS</h2>
          <p className="text-sm text-amber-400 tracking-widest uppercase">Team {currentTeamIdx + 1} of 12</p>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border-t-4 border-t-amber-500">
        <div className="bg-slate-900/80 p-6 flex items-center gap-6 border-b border-white/10">
          <span className="text-6xl drop-shadow-lg">{country.flag}</span>
          <div>
            <h3 className="text-3xl font-display font-bold text-white tracking-wide">{country.name}</h3>
            <p className="text-slate-400 text-sm mt-1">Assign 5 gymnasts. Select apparatus for each (Min 3, Max 4 per app).</p>
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

          {currentTeam.gymnasts.map((gymnast, idx) => (
            <motion.div 
              key={gymnast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="grid grid-cols-12 gap-4 items-center bg-slate-800/30 p-2 rounded-xl border border-white/5 hover:bg-slate-800/50 transition-colors"
            >
              <div className="col-span-1 text-center font-display font-bold text-amber-500/50 text-xl">
                {idx + 1}
              </div>
              <div className="col-span-12 sm:col-span-5">
                <input 
                  type="text"
                  value={gymnast.name}
                  onChange={(e) => updateGymnastName(idx, e.target.value)}
                  placeholder={`Gymnast ${idx + 1} Name`}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
              <div className="col-span-12 sm:col-span-6 flex justify-between items-center gap-1 overflow-x-auto no-scrollbar">
                {APPARATUS_LIST.map(app => {
                  const isSelected = gymnast.apparatus.includes(app);
                  const isVtBlock = (app === 'VT' || app === 'VT*');
                  const countForLimit = isVtBlock ? totalVaults : appCounts[app];
                  const maxReached = countForLimit >= 4 && !isSelected && (!isVtBlock || (!gymnast.apparatus.includes('VT') && !gymnast.apparatus.includes('VT*')));
                  
                  return (
                    <button
                      key={app}
                      onClick={() => toggleApparatus(idx, app)}
                      disabled={maxReached}
                      className={clsx(
                        "px-3 py-2 rounded-lg font-bold text-sm min-w-[3.5rem] transition-all duration-200 border-2",
                        isSelected 
                          ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[inset_0_0_10px_rgba(212,175,55,0.2)]" 
                          : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300",
                        maxReached && !isSelected && "opacity-30 cursor-not-allowed hover:border-slate-700"
                      )}
                      title={app === 'VT*' ? 'Two vaults for Event Final qualification' : ''}
                    >
                      {app}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-slate-900/80 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/10">
          
          <div className="flex gap-4">
            {[
              { id: 'VT', label: 'VT', count: totalVaults },
              { id: 'UB', label: 'UB', count: appCounts['UB'] },
              { id: 'BB', label: 'BB', count: appCounts['BB'] },
              { id: 'FX', label: 'FX', count: appCounts['FX'] }
            ].map(stat => (
              <div key={stat.id} className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{stat.label}</span>
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
                  stat.count < 3 ? "border-red-500/50 bg-red-500/10 text-red-400" :
                  stat.count === 4 ? "border-amber-500/50 bg-amber-500/10 text-amber-400" :
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
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
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
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
              {currentTeamIdx === 11 ? (
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
