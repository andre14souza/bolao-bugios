import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, Shuffle, RotateCcw, Lock } from 'lucide-react';
import { saveGroupQualifier } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';

export default function GroupStagePredictions({ matches, groupQualifiers, currentUser, onReload }) {
  const [groupTeams, setGroupTeams] = useState({});
  const [localPicks, setLocalPicks] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [warning, setWarning] = useState(null);

  // Carrega times por grupo e as seleções anteriores do usuário
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

    const initialPicks = {};
    Object.keys(parsedGroupTeams).forEach(g => {
      const userPick = groupQualifiers.guesses.find(qp => qp.user === currentUser && qp.group === g);
      initialPicks[g] = {
        first: userPick?.first || '',
        second: userPick?.second || '',
        third: userPick?.third || ''
      };
    });
    setLocalPicks(initialPicks);
  }, [matches, groupQualifiers, currentUser]);

  const thirdPlacesCount = Object.values(localPicks).filter(p => p.third).length;

  // Handler para cliques nas células de classificação (1º, 2º, 3º)
  const handleCellClick = (group, spot, team) => {
    setLocalPicks(prev => {
      const current = prev[group] || { first: '', second: '', third: '' };
      const updated = { ...current };

      if (current[spot] === team) {
        updated[spot] = '';
      } else {
        if (spot === 'third') {
          const othersCount = Object.entries(prev)
            .filter(([g, p]) => g !== group && p.third)
            .length;
          if (othersCount >= 8) {
            setWarning('Você já selecionou o 3º lugar em 8 grupos! Desmarque um antes de escolher outro.');
            setTimeout(() => setWarning(null), 5000);
            return prev;
          }
        }

        updated[spot] = team;

        if (spot === 'first') {
          if (current.second === team) updated.second = '';
          if (current.third === team) updated.third = '';
        } else if (spot === 'second') {
          if (current.first === team) updated.first = '';
          if (current.third === team) updated.third = '';
        } else if (spot === 'third') {
          if (current.first === team) updated.first = '';
          if (current.second === team) updated.second = '';
        }
      }

      return {
        ...prev,
        [group]: updated
      };
    });
    setSaveStatus(null);
  };

  // Sorteia 1º, 2º e 3º para todos os grupos (respeitando o limite de 8 terceiros)
  const handleRandomizeAll = () => {
    const randomPicks = {};
    const groups = Object.keys(groupTeams);
    const shuffledGroups = [...groups].sort(() => 0.5 - Math.random());
    const groupsWithThird = new Set(shuffledGroups.slice(0, 8));

    groups.forEach(g => {
      const teams = [...groupTeams[g]];
      const shuffledTeams = [...teams].sort(() => 0.5 - Math.random());
      randomPicks[g] = {
        first: shuffledTeams[0],
        second: shuffledTeams[1],
        third: groupsWithThird.has(g) ? shuffledTeams[2] : ''
      };
    });
    setLocalPicks(randomPicks);
    setSaveStatus(null);
  };

  // Reseta todos os palpites
  const handleReset = () => {
    const cleared = {};
    Object.keys(groupTeams).forEach(g => {
      cleared[g] = { first: '', second: '', third: '' };
    });
    setLocalPicks(cleared);
    setSaveStatus(null);
  };

  // Sorteia apenas um grupo específico
  const handleRandomizeGroup = (group) => {
    const teams = [...groupTeams[group]];
    const shuffledTeams = [...teams].sort(() => 0.5 - Math.random());
    
    const currentlyHasThird = !!localPicks[group]?.third;
    const currentThirdsCount = Object.values(localPicks).filter(p => p.third).length;
    const canSelectThird = currentlyHasThird || currentThirdsCount < 8;

    setLocalPicks(prev => ({
      ...prev,
      [group]: {
        first: shuffledTeams[0],
        second: shuffledTeams[1],
        third: canSelectThird ? shuffledTeams[2] : ''
      }
    }));
    setSaveStatus(null);
  };

  // Salva no banco de dados local ou remoto
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const promises = Object.entries(localPicks).map(async ([group, picks]) => {
        // Salva se preencheu posições ou se limpou todas elas
        await saveGroupQualifier(currentUser, group, picks.first || null, picks.second || null, picks.third || null);
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
    <div className="max-w-7xl mx-auto px-4 py-8 relative bg-field-pattern">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 select-none">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white animate-fadeIn">
            📋 Classificação de Grupos
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Escolha quem passa em 1º, 2º e os melhores 3º colocados de cada grupo.
          </p>
        </div>

        {/* Ações Globais */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleRandomizeAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-white/5"
            title="Sorteia palpites aleatórios para todos os grupos"
          >
            <Shuffle size={14} />
            Sortear Tudo
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 bg-slate-850 hover:bg-rose-950 hover:text-rose-300 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-white/5"
            title="Limpa todas as suas seleções"
          >
            <RotateCcw size={14} />
            Resetar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-football-vibrantGreen to-emerald-600 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={14} />
            )}
            <span>Salvar Classificados</span>
          </button>
        </div>
      </div>

      {/* Regra de Validação dos 3º colocados */}
      <div className="mb-8 p-4 rounded-2xl glass-panel border border-football-glassBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">ℹ️</span>
          <div>
            <p className="text-sm font-bold text-white">Regra da Copa 2026: 8 melhores terceiros colocados</p>
            <p className="text-xs text-slate-400">Marque a posição do 3º lugar apenas nos grupos onde você prevê que eles avançam para o mata-mata.</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
          thirdPlacesCount === 8
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            : 'bg-football-gold/10 border-football-gold/25 text-football-brightYellow'
        }`}>
          Terceiros Colocados: {thirdPlacesCount} / 8 selecionados
        </div>
      </div>

      {/* Alertas de Feedback */}
      {warning && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown select-none">
          <AlertCircle size={18} />
          <span>{warning}</span>
        </div>
      )}
      {saveStatus === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-semibold animate-slideDown select-none">
          <Check size={18} />
          <span>Suas previsões de classificação dos grupos foram salvas com sucesso!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown select-none">
          <AlertCircle size={18} />
          <span>Erro ao salvar no banco. Verifique se o servidor Express está ativo.</span>
        </div>
      )}

      {/* Grid de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(gName => {
          const picks = localPicks[gName] || { first: '', second: '', third: '' };
          const actual = groupQualifiers.results[gName] || { first: null, second: null, third: null };
          const hasActualResults = actual.first !== null || actual.second !== null || actual.third !== null;

          let scoreTotal = 0;
          let firstPoints = null;
          let secondPoints = null;
          let thirdPoints = null;

          if (hasActualResults) {
            // Pontuação 1º
            if (picks.first) {
              if (picks.first === actual.first) firstPoints = 5;
              else if (picks.first === actual.second || picks.first === actual.third) firstPoints = 3;
              else firstPoints = 0;
            }
            // Pontuação 2º
            if (picks.second) {
              if (picks.second === actual.second) secondPoints = 5;
              else if (picks.second === actual.first || picks.second === actual.third) secondPoints = 3;
              else secondPoints = 0;
            }
            // Pontuação 3º
            if (picks.third) {
              if (picks.third === actual.third) thirdPoints = 5;
              else if (picks.third === actual.first || picks.third === actual.second) thirdPoints = 3;
              else thirdPoints = 0;
            }
            scoreTotal = (firstPoints || 0) + (secondPoints || 0) + (thirdPoints || 0);
          }

          return (
            <div key={gName} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-4 transition-all hover:border-football-vibrantGreen/20">
              {/* Header do Grupo */}
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-lg font-bold text-white">{gName}</span>
                <div className="flex items-center gap-2">
                  {hasActualResults && (
                    <span className="text-[10px] bg-football-gold/15 text-football-brightYellow px-2 py-0.5 rounded-full border border-football-gold/30 font-bold">
                      +{scoreTotal} pts
                    </span>
                  )}
                  {!hasActualResults && (
                    <button
                      onClick={() => handleRandomizeGroup(gName)}
                      className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 font-semibold px-2 py-1 rounded-lg border border-white/5 transition-all cursor-pointer"
                      title="Sorteia classificação apenas para este grupo"
                    >
                      <Shuffle size={10} />
                      Sortear
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela do Grupo */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                    <th className="py-2 px-2">Seleção</th>
                    <th className="py-2 px-2 text-center w-10">1º</th>
                    <th className="py-2 px-2 text-center w-10">2º</th>
                    <th className="py-2 px-2 text-center w-10">3º</th>
                  </tr>
                </thead>
                <tbody>
                  {groupTeams[gName]?.map(team => {
                    const is1st = picks.first === team;
                    const is2nd = picks.second === team;
                    const is3rd = picks.third === team;

                    return (
                      <tr key={team} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        {/* Time Info */}
                        <td className="py-2.5 px-2 flex items-center gap-2 select-none">
                          <span className="text-xl filter drop-shadow">{TEAM_FLAGS[team] || '🏳️'}</span>
                          <span className="font-semibold text-xs text-white truncate max-w-[110px]">{team}</span>
                        </td>

                        {/* Botão 1º */}
                        <td className="py-2.5 px-2 text-center">
                          {hasActualResults ? (
                            <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-xs font-bold ${
                              actual.first === team ? 'bg-football-gold text-football-darkGreen' : is1st ? 'bg-slate-750 text-slate-400 border border-white/5' : ''
                            }`}>
                              {actual.first === team ? '🥇' : is1st ? '1º' : ''}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(gName, 'first', team)}
                              className={`w-7 h-7 rounded-lg border mx-auto flex items-center justify-center text-[10px] font-extrabold transition-all cursor-pointer ${
                                is1st
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow shadow-emerald-500/25 scale-105'
                                  : 'border-white/10 hover:border-emerald-500/40 text-slate-500 hover:text-emerald-400'
                              }`}
                            >
                              {is1st ? '🥇' : ''}
                            </button>
                          )}
                        </td>

                        {/* Botão 2º */}
                        <td className="py-2.5 px-2 text-center">
                          {hasActualResults ? (
                            <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-xs font-bold ${
                              actual.second === team ? 'bg-slate-300 text-football-darkGreen' : is2nd ? 'bg-slate-750 text-slate-400 border border-white/5' : ''
                            }`}>
                              {actual.second === team ? '🥈' : is2nd ? '2º' : ''}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(gName, 'second', team)}
                              className={`w-7 h-7 rounded-lg border mx-auto flex items-center justify-center text-[10px] font-extrabold transition-all cursor-pointer ${
                                is2nd
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow shadow-blue-500/25 scale-105'
                                  : 'border-white/10 hover:border-blue-500/40 text-slate-500 hover:text-blue-400'
                              }`}
                            >
                              {is2nd ? '🥈' : ''}
                            </button>
                          )}
                        </td>

                        {/* Botão 3º */}
                        <td className="py-2.5 px-2 text-center">
                          {hasActualResults ? (
                            <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-xs font-bold ${
                              actual.third === team ? 'bg-amber-600 text-white' : is3rd ? 'bg-slate-750 text-slate-400 border border-white/5' : ''
                            }`}>
                              {actual.third === team ? '🥉' : is3rd ? '3º' : ''}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(gName, 'third', team)}
                              className={`w-7 h-7 rounded-lg border mx-auto flex items-center justify-center text-[10px] font-extrabold transition-all cursor-pointer ${
                                is3rd
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow shadow-amber-500/25 scale-105'
                                  : 'border-white/10 hover:border-amber-500/40 text-slate-500 hover:text-amber-400'
                              }`}
                            >
                              {is3rd ? '🥉' : ''}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Resultado Oficial no Rodapé */}
              {hasActualResults && (
                <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-1 text-[10px] text-slate-400 select-none">
                  <div className="flex justify-between items-center">
                    <span>Oficial:</span>
                    <div className="flex gap-1.5 font-bold">
                      <span className="text-football-gold">🥇 {actual.first || 'N/A'}</span>
                      <span className="text-slate-300">🥈 {actual.second || 'N/A'}</span>
                      <span className="text-amber-500">🥉 {actual.third || 'N/A'}</span>
                    </div>
                  </div>
                  {/* Feedback de Palpite do Usuário */}
                  <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1">
                    <span>Seu palpite:</span>
                    <div className="flex gap-2">
                      <span className={firstPoints === 5 ? 'text-emerald-400' : firstPoints === 3 ? 'text-football-brightYellow' : 'text-slate-500'}>
                        1º: {picks.first ? (firstPoints === 5 ? 'Acertou' : firstPoints === 3 ? 'Invertido' : 'Errou') : 'Sem palpite'}
                      </span>
                      <span className={secondPoints === 5 ? 'text-emerald-400' : secondPoints === 3 ? 'text-football-brightYellow' : 'text-slate-500'}>
                        2º: {picks.second ? (secondPoints === 5 ? 'Acertou' : secondPoints === 3 ? 'Invertido' : 'Errou') : 'Sem palpite'}
                      </span>
                      <span className={thirdPoints === 5 ? 'text-emerald-400' : thirdPoints === 3 ? 'text-football-brightYellow' : 'text-slate-500'}>
                        3º: {picks.third ? (thirdPoints === 5 ? 'Acertou' : thirdPoints === 3 ? 'Invertido' : 'Errou') : 'Sem palpite'}
                      </span>
                    </div>
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
