import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import { saveGroupQualifier } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';

export default function GroupStagePredictions({ matches, groupQualifiers, currentUser, onReload }) {
  // Estado local para armazenar times por grupo e seleções do usuário
  const [groupTeams, setGroupTeams] = useState({});
  const [localPicks, setLocalPicks] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const teamsByGroup = {};
    matches.forEach(m => {
      if (m.stage === 'group') {
        if (!teamsByGroup[m.group]) {
          teamsByGroup[m.group] = new Set();
        }
        teamsByGroup[m.group].add(m.homeTeam);
        teamsByGroup[m.group].add(m.awayTeam);
      }
    });

    const parsedGroupTeams = {};
    Object.keys(teamsByGroup).forEach(g => {
      parsedGroupTeams[g] = Array.from(teamsByGroup[g]).sort();
    });
    setGroupTeams(parsedGroupTeams);

    // Carrega palpites já salvos no banco local
    const initialPicks = {};
    Object.keys(parsedGroupTeams).forEach(g => {
      const userPick = groupQualifiers.guesses.find(qp => qp.user === currentUser && qp.group === g);
      initialPicks[g] = {
        first: userPick?.first || '',
        second: userPick?.second || ''
      };
    });
    setLocalPicks(initialPicks);
  }, [matches, groupQualifiers, currentUser]);

  const handlePickChange = (group, spot, team) => {
    setLocalPicks(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [spot]: team
      }
    }));
    setSaveStatus(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const promises = Object.entries(localPicks).map(async ([group, picks]) => {
        // Salva apenas se ambos os campos estiverem preenchidos, ou ambos vazios (limpeza)
        if ((picks.first && picks.second) || (!picks.first && !picks.second)) {
          await saveGroupQualifier(currentUser, group, picks.first, picks.second);
        }
      });
      await Promise.all(promises);
      setSaveStatus('success');
      onReload();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const groups = Object.keys(groupTeams).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white animate-fadeIn">
            📋 Classificação de Grupos
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Escolha quem passa em 1º e 2º lugar de cada grupo da Copa.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-football-vibrantGreen to-emerald-600 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save size={18} />
          )}
          <span>Salvar Classificados</span>
        </button>
      </div>

      {/* Alertas de Feedback */}
      {saveStatus === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <Check size={18} />
          <span>Suas previsões de classificação dos grupos foram salvas!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} />
          <span>Erro ao salvar no banco. Verifique se o servidor Express está ativo.</span>
        </div>
      )}

      {/* Grid de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map(g => {
          const picks = localPicks[g] || { first: '', second: '' };
          const actual = groupQualifiers.results[g] || { first: null, second: null };
          const hasActualResults = actual.first !== null || actual.second !== null;

          // Cálculo dos pontos exibidos na tela
          let firstPoints = null;
          let secondPoints = null;

          if (hasActualResults) {
            if (picks.first) {
              if (picks.first === actual.first) firstPoints = 5;
              else if (picks.first === actual.second) firstPoints = 3;
              else firstPoints = 0;
            }
            if (picks.second) {
              if (picks.second === actual.second) secondPoints = 5;
              else if (picks.second === actual.first) secondPoints = 3;
              else secondPoints = 0;
            }
          }

          return (
            <div key={g} className="glass-panel p-6 rounded-2xl border border-football-glassBorder flex flex-col gap-4 transition-all hover:border-football-vibrantGreen/20">
              <h2 className="text-xl font-bold text-football-brightYellow border-b border-white/5 pb-2 flex justify-between items-center">
                <span>{g}</span>
                {hasActualResults && (
                  <span className="text-xs bg-football-gold/10 text-football-gold px-2.5 py-1 rounded-full border border-football-gold/30 font-bold">
                    Acumulado: {((firstPoints || 0) + (secondPoints || 0))} pts
                  </span>
                )}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                {/* 1º Lugar */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    🥇 1º Lugar
                  </label>
                  {hasActualResults ? (
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2 select-none">
                      <span className="text-xl">{TEAM_FLAGS[picks.first] || '🏳️'}</span>
                      <span className="text-sm font-semibold truncate text-slate-300">{picks.first || 'Sem palpite'}</span>
                    </div>
                  ) : (
                    <select
                      value={picks.first}
                      onChange={(e) => handlePickChange(g, 'first', e.target.value)}
                      className="p-3 rounded-xl glass-input text-sm font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[g]?.map(t => (
                        <option key={t} value={t} disabled={t === picks.second}>
                          {TEAM_FLAGS[t] || ''} {t}
                        </option>
                      ))}
                    </select>
                  )}
                  {hasActualResults && picks.first && (
                    <span className={`text-[10px] font-bold mt-1 text-center py-1 rounded-lg ${
                      firstPoints === 5 ? 'text-emerald-400 bg-emerald-500/10' : firstPoints === 3 ? 'text-football-brightYellow bg-yellow-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {firstPoints === 5 ? 'Exato (+5 pts) 🎯' : firstPoints === 3 ? 'Invertido (+3 pts) 🔄' : 'Errou (0 pts)'}
                    </span>
                  )}
                </div>

                {/* 2º Lugar */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    🥈 2º Lugar
                  </label>
                  {hasActualResults ? (
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center gap-2 select-none">
                      <span className="text-xl">{TEAM_FLAGS[picks.second] || '🏳️'}</span>
                      <span className="text-sm font-semibold truncate text-slate-300">{picks.second || 'Sem palpite'}</span>
                    </div>
                  ) : (
                    <select
                      value={picks.second}
                      onChange={(e) => handlePickChange(g, 'second', e.target.value)}
                      className="p-3 rounded-xl glass-input text-sm font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[g]?.map(t => (
                        <option key={t} value={t} disabled={t === picks.first}>
                          {TEAM_FLAGS[t] || ''} {t}
                        </option>
                      ))}
                    </select>
                  )}
                  {hasActualResults && picks.second && (
                    <span className={`text-[10px] font-bold mt-1 text-center py-1 rounded-lg ${
                      secondPoints === 5 ? 'text-emerald-400 bg-emerald-500/10' : secondPoints === 3 ? 'text-football-brightYellow bg-yellow-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}>
                      {secondPoints === 5 ? 'Exato (+5 pts) 🎯' : secondPoints === 3 ? 'Invertido (+3 pts) 🔄' : 'Errou (0 pts)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Mostra o resultado oficial no rodapé */}
              {hasActualResults && (
                <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 select-none">
                  <span>Oficial do Grupo:</span>
                  <div className="flex gap-2">
                    <span className="bg-football-gold/10 text-football-brightYellow px-2 py-0.5 rounded font-bold">
                      1º {actual.first}
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                      2º {actual.second}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
