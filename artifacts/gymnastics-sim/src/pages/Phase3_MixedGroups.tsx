import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Users, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { COUNTRIES, CONTINENTS, getCountryById } from "@/lib/countries";
import { MixedGroup, Gymnast, Apparatus, Continent } from "@/lib/types";
import { clsx } from "clsx";

const APPARATUS_LIST: Apparatus[] = ['VT', 'VT*', 'UB', 'BB', 'FX'];

export default function Phase3_MixedGroups() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [groups, setGroups] = useState<Record<string, MixedGroup>>({});
  const [warning, setWarning] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGroupForModal, setActiveGroupForModal] = useState<string | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<Continent | ''>('');
  const [newGymnast, setNewGymnast] = useState<Partial<Gymnast>>({ name: '', countryId: '', apparatus: ['VT', 'UB', 'BB', 'FX'] });

  useEffect(() => {
    if (Object.keys(state.teams).length === 0) {
      setLocation("/roster");
      return;
    }

    if (Object.keys(state.mixedGroups).length === 0) {
      const initial: Record<string, MixedGroup> = {};
      for (let i = 1; i <= 8; i++) {
        initial[`MG${i}`] = { id: `MG${i}`, name: `Mixed Group ${i}`, gymnasts: [] };
      }
      setGroups(initial);
    } else {
      setGroups(state.mixedGroups);
    }
  }, [state.teams, state.mixedGroups, setLocation]);

  const allAssignedGymnasts = useMemo(() => {
    return Object.values(groups).flatMap(g => g.gymnasts);
  }, [groups]);

  const totalAssigned = allAssignedGymnasts.length;
  const spotsLeft = 36 - totalAssigned;

  const eligibleCountries = useMemo(() => {
    return COUNTRIES.filter(c => !state.selectedCountries.includes(c.id));
  }, [state.selectedCountries]);

  const availableCountries = useMemo(() => {
    if (!selectedContinent) return [];
    return eligibleCountries.filter(country => country.continent === selectedContinent);
  }, [eligibleCountries, selectedContinent]);

  const getCountryGymnastCount = (cId: string) => {
    return allAssignedGymnasts.filter(g => g.countryId === cId).length;
  };

  const openAddModal = (groupId: string) => {
    if (groups[groupId].gymnasts.length >= 6) {
      setWarning(`Mixed Group ${groupId} already has the maximum of 6 gymnasts.`);
      setTimeout(()=>setWarning(null), 3000);
      return;
    }
    if (spotsLeft <= 0) {
      setWarning(`All 36 mixed group spots are filled.`);
      setTimeout(()=>setWarning(null), 3000);
      return;
    }
    setActiveGroupForModal(groupId);
    setSelectedContinent('');
    setNewGymnast({ name: '', countryId: '', apparatus: ['VT', 'UB', 'BB', 'FX'] });
    setIsModalOpen(true);
  };

  const handleAddGymnast = () => {
    if (!newGymnast.name || !newGymnast.countryId) return;
    if (newGymnast.apparatus!.length === 0) return;

    if (getCountryGymnastCount(newGymnast.countryId) >= 3) {
       setWarning("Maximum 3 gymnasts allowed per country in mixed groups.");
       setTimeout(()=>setWarning(null), 3000);
       return;
    }

    const gId = `${newGymnast.countryId}_MG_${Date.now()}`;
    const gymnast: Gymnast = {
      id: gId,
      name: newGymnast.name,
      countryId: newGymnast.countryId,
      apparatus: newGymnast.apparatus as Apparatus[],
      isMixedGroup: true,
      mixedGroupId: activeGroupForModal!
    };

    setGroups(prev => ({
      ...prev,
      [activeGroupForModal!]: {
        ...prev[activeGroupForModal!],
        gymnasts: [...prev[activeGroupForModal!].gymnasts, gymnast]
      }
    }));
    
    setSelectedContinent('');
    setIsModalOpen(false);
  };

  const removeGymnast = (groupId: string, gymnastId: string) => {
    setGroups(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        gymnasts: prev[groupId].gymnasts.filter(g => g.id !== gymnastId)
      }
    }));
  };

  const validateAndContinue = () => {
    if (totalAssigned !== 36) {
      setWarning(`You must assign exactly 36 gymnasts. Currently assigned: ${totalAssigned}`);
      return;
    }
    const invalidGroups = Object.values(groups).filter(g => g.gymnasts.length < 2);
    if (invalidGroups.length > 0) {
      setWarning(`Every mixed group must have at least 2 gymnasts. Check ${invalidGroups.map(g=>g.name).join(', ')}`);
      return;
    }

    dispatch({ type: 'SET_MIXED_GROUPS', payload: groups });
    if (state.phase < 4) dispatch({ type: 'SET_PHASE', payload: 4 });
    setLocation("/rotation");
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 relative">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setLocation("/roster")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-1">MIXED GROUPS</h2>
          <p className="text-sm text-slate-400">Distribute remaining 36 individual spots</p>
        </div>
        <div className="w-20" />
      </div>

      {warning && (
        <div className="mb-6 mx-auto max-w-2xl bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium">{warning}</p>
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl mb-8 flex justify-between items-center border-l-4 border-l-amber-500">
        <div>
          <h3 className="text-xl font-bold text-white">Remaining Spots</h3>
          <p className="text-slate-400 text-sm mt-1">Each of the 8 groups needs 2-6 gymnasts.</p>
        </div>
        <div className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
          {spotsLeft}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.values(groups).map((group) => (
          <div key={group.id} className="glass-panel rounded-xl overflow-hidden border border-white/5 flex flex-col">
            <div className="bg-slate-900/60 p-4 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <h4 className="font-bold text-white">{group.name}</h4>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-slate-400">
                {group.gymnasts.length} / 6
              </span>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-2 min-h-[160px]">
              <AnimatePresence>
                {group.gymnasts.map(g => (
                  <motion.div 
                    key={g.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between bg-slate-800/50 p-2 pl-3 rounded-lg border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getCountryById(g.countryId).flag}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{g.name}</p>
                        <p className="text-[10px] text-amber-500/70 uppercase font-bold tracking-wider">{g.apparatus.join(', ')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeGymnast(group.id, g.id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {group.gymnasts.length < 6 && spotsLeft > 0 && (
                <button 
                  onClick={() => openAddModal(group.id)}
                  className="mt-auto w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 font-medium hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Gymnast
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <button
          onClick={validateAndContinue}
          className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg uppercase tracking-wide transition-all duration-300 bg-gold-gradient text-slate-950 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-95"
        >
          Continue to Rotation <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <div className="bg-slate-900 p-5 flex justify-between items-center border-b border-white/10">
              <h3 className="font-bold text-lg text-white">Add Gymnast to {activeGroupForModal}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Continent</label>
                <select
                  value={selectedContinent}
                  onChange={e => {
                    const continent = e.target.value as Continent | '';
                    setSelectedContinent(continent);
                    setNewGymnast({ ...newGymnast, countryId: '' });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-amber-500 outline-none"
                >
                  <option value="">Select Continent...</option>
                  {CONTINENTS.map(continent => (
                    <option key={continent} value={continent}>
                      {continent}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Country</label>
                <select 
                  value={newGymnast.countryId || ''} 
                  onChange={e => setNewGymnast({...newGymnast, countryId: e.target.value})}
                  disabled={!selectedContinent || availableCountries.length === 0}
                  className={clsx(
                    "w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-amber-500 outline-none",
                    (!selectedContinent || availableCountries.length === 0) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <option value="">
                    {selectedContinent ? 'Select Country...' : 'Select a continent first...'}
                  </option>
                  {availableCountries.map(c => {
                    const count = getCountryGymnastCount(c.id);
                    const disabled = count >= 3;
                    return (
                      <option key={c.id} value={c.id} disabled={disabled}>
                        {c.name} {disabled ? '(Max 3 reached)' : `(${3-count} spots left)`}
                      </option>
                    )
                  })}
                </select>
                {selectedContinent && availableCountries.length === 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    No eligible countries available for {selectedContinent}.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gymnast Name</label>
                <input 
                  type="text"
                  value={newGymnast.name || ''}
                  onChange={e => setNewGymnast({...newGymnast, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:border-amber-500 outline-none"
                  placeholder="e.g. Simone Biles"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Apparatus</label>
                <div className="flex gap-2">
                  {APPARATUS_LIST.map(app => {
                    const isSelected = newGymnast.apparatus?.includes(app);
                    return (
                      <button
                        key={app}
                        onClick={() => {
                          let apps = [...(newGymnast.apparatus || [])];
                          if (isSelected) apps = apps.filter(a => a !== app);
                          else {
                            if (app === 'VT' && apps.includes('VT*')) apps = apps.filter(a=>a!=='VT*');
                            if (app === 'VT*' && apps.includes('VT')) apps = apps.filter(a=>a!=='VT');
                            apps.push(app);
                          }
                          setNewGymnast({...newGymnast, apparatus: apps});
                        }}
                        className={clsx(
                          "flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors",
                          isSelected ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-slate-900 border-slate-700 text-slate-400"
                        )}
                      >
                        {app}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button 
                onClick={handleAddGymnast}
                disabled={!newGymnast.name || !newGymnast.countryId || newGymnast.apparatus!.length === 0}
                className="w-full mt-4 py-3 rounded-xl font-bold bg-amber-500 text-slate-950 disabled:opacity-50 transition-all hover:bg-amber-400"
              >
                Confirm Addition
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
