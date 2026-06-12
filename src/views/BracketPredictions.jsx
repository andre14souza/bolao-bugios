import React, { useState, useEffect } from 'react';
import { Save, Check, Award, AlertCircle } from 'lucide-react';
import { saveBracket } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';
import { checkIsPlaceholder } from './Knockout';

export default function BracketPredictions({ matches, bracketGuesses, currentUser, onReload }) {
  // Lista de todas as seleções extraídas dinamicamente
  const [allTeams, setAllTeams] = useState([]);
  const [localBracket, setLocalBracket] = useState({
    quartas: Array(8).fill(''),
    semis: Array(4).fill(''),
    finalists: Array(2).fill(''),
    champion: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    // Extrai seleções que jogaram a fase de grupos
    const teams = new Set();
    matches.forEach(m => {
      if (m.homeTeam && !checkIsPlaceholder(m.homeTeam)) {
        teams.add(m.homeTeam);
      }
      if (m.awayTeam && !checkIsPlaceholder(m.awayTeam)) {
        teams.add(m.awayTeam);
      }
    });
    setAllTeams(Array.from(teams).sort());

    // Carrega o palpite do usuário, se houver
    const userGuess = bracketGuesses.guesses.find(b => b.user === currentUser);
    if (userGuess) {
      setLocalBracket({
        quartas: userGuess.quartas || Array(8).fill(''),
        semis: userGuess.semis || Array(4).fill(''),
        finalists: userGuess.finalists || Array(2).fill(''),
        champion: userGuess.champion || ''
      });
    }
  }, [matches, bracketGuesses, currentUser]);

  const handleSelect = (stage, index, value) => {
    setLocalBracket(prev => {
      const updated = { ...prev };
      if (stage === 'champion') {
        updated.champion = value;
      } else {
        updated[stage] = [...prev[stage]];
        updated[stage][index] = value;
        
        // Reset em cascata: se retirar uma seleção, ela é eliminada das fases seguintes
        const oldTeam = prev[stage][index];
        if (oldTeam && oldTeam !== value) {
          if (stage === 'quartas') {
            updated.semis = updated.semis.map(t => t === oldTeam ? '' : t);
            updated.finalists = updated.finalists.map(t => t === oldTeam ? '' : t);
            if (updated.champion === oldTeam) updated.champion = '';
          } else if (stage === 'semis') {
            updated.finalists = updated.finalists.map(t => t === oldTeam ? '' : t);
            if (updated.champion === oldTeam) updated.champion = '';
          } else if (stage === 'finalists') {
            if (updated.champion === oldTeam) updated.champion = '';
          }
        }
      }
      return updated;
    });
    setSaveStatus(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await saveBracket(
        currentUser,
        localBracket.quartas,
        localBracket.semis,
        localBracket.finalists,
        localBracket.champion
      );
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

  const actual = bracketGuesses.results || { quartas: [], semis: [], finalists: [], champion: null };
  const hasActualResults = (actual.quartas && actual.quartas.length > 0) || (actual.semis && actual.semis.length > 0) || actual.champion !== null;

  // Calcula parciais de pontos para exibição
  let quartasPts = 0;
  let semisPts = 0;
  let finalistsPts = 0;
  let championPts = 0;

  if (hasActualResults) {
    localBracket.quartas.forEach(t => {
      if (t && actual.quartas?.includes(t)) quartasPts += 2;
    });
    localBracket.semis.forEach(t => {
      if (t && actual.semis?.includes(t)) semisPts += 4;
    });
    localBracket.finalists.forEach(t => {
      if (t && actual.finalists?.includes(t)) finalistsPts += 8;
    });
    if (localBracket.champion && localBracket.champion === actual.champion) {
      championPts = 10;
    }
  }

  const totalBracketPoints = quartasPts + semisPts + finalistsPts + championPts;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            🏆 Chaveamento do Mata-mata
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Selecione as seleções para cada vaga. As opções de cada etapa dependem de quem você classificou na etapa anterior!
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
          <span>Salvar Chaveamento</span>
        </button>
      </div>

      {/* Alertas de Feedback */}
      {saveStatus === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <Check size={18} />
          <span>Seu chaveamento de mata-mata foi salvo com sucesso!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} />
          <span>Erro ao salvar chaveamento. Verifique se o Express está respondendo.</span>
        </div>
      )}

      {/* Banner de Pontuação Apurada */}
      {hasActualResults && (
        <div className="mb-8 p-4 glass-panel rounded-2xl border border-football-gold/30 bg-football-gold/5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <Award className="text-football-gold animate-bounce-slow" size={24} />
            <div>
              <p className="font-extrabold text-white text-base">Mata-mata Apurado!</p>
              <p className="text-xs text-slate-400">Total de pontos ganhos com o chaveamento.</p>
            </div>
          </div>
          <span className="text-lg md:text-xl font-black text-football-gold bg-football-gold/15 px-4 py-2 rounded-xl border border-football-gold/30">
            +{totalBracketPoints} pts
          </span>
        </div>
      )}

      {/* Grid de Colunas (Fases do Chaveamento) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {/* Quartas de Final (8 Vagas) */}
        <div className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2 flex justify-between select-none">
            <span>Quartas (2 pts)</span>
            {hasActualResults && <span className="text-football-gold">+{quartasPts} pts</span>}
          </h3>
          {Array(8).fill('').map((_, i) => {
            const team = localBracket.quartas[i] || '';
            const isCorrect = hasActualResults && team && actual.quartas?.includes(team);
            return (
              <div key={i} className="flex flex-col gap-1">
                {hasActualResults ? (
                  <div className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-between select-none ${
                    isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/30 border-white/5 text-slate-500'
                  }`}>
                    <span className="truncate">{TEAM_FLAGS[team] || '🏳️'} {team || 'Sem escolha'}</span>
                    {team && (isCorrect ? '🎯' : '❌')}
                  </div>
                ) : (
                  <select
                    value={team}
                    onChange={(e) => handleSelect('quartas', i, e.target.value)}
                    className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                  >
                    <option value="">Selecione a vaga #{i+1}...</option>
                    {allTeams.map(t => (
                      <option key={t} value={t} disabled={localBracket.quartas.includes(t) && t !== team}>
                        {TEAM_FLAGS[t]} {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Semifinais (4 Vagas) */}
        <div className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2 flex justify-between select-none">
            <span>Semis (4 pts)</span>
            {hasActualResults && <span className="text-football-gold">+{semisPts} pts</span>}
          </h3>
          {Array(4).fill('').map((_, i) => {
            const team = localBracket.semis[i] || '';
            const isCorrect = hasActualResults && team && actual.semis?.includes(team);
            // Filtra as opções baseando-se apenas nos selecionados nas Quartas
            const options = localBracket.quartas.filter(t => t !== '');
            return (
              <div key={i} className="flex flex-col gap-1">
                {hasActualResults ? (
                  <div className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-between select-none ${
                    isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/30 border-white/5 text-slate-500'
                  }`}>
                    <span className="truncate">{TEAM_FLAGS[team] || '🏳️'} {team || 'Sem escolha'}</span>
                    {team && (isCorrect ? '🎯' : '❌')}
                  </div>
                ) : (
                  <select
                    value={team}
                    disabled={options.length === 0}
                    onChange={(e) => handleSelect('semis', i, e.target.value)}
                    className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                  >
                    <option value="">Selecione o semifinalista #{i+1}...</option>
                    {options.map(t => (
                      <option key={t} value={t} disabled={localBracket.semis.includes(t) && t !== team}>
                        {TEAM_FLAGS[t]} {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Finalistas (2 Vagas) */}
        <div className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2 flex justify-between select-none">
            <span>Finalistas (8 pts)</span>
            {hasActualResults && <span className="text-football-gold">+{finalistsPts} pts</span>}
          </h3>
          {Array(2).fill('').map((_, i) => {
            const team = localBracket.finalists[i] || '';
            const isCorrect = hasActualResults && team && actual.finalists?.includes(team);
            // Filtra opções com base nos selecionados na Semifinal
            const options = localBracket.semis.filter(t => t !== '');
            return (
              <div key={i} className="flex flex-col gap-1">
                {hasActualResults ? (
                  <div className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-between select-none ${
                    isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/30 border-white/5 text-slate-500'
                  }`}>
                    <span className="truncate">{TEAM_FLAGS[team] || '🏳️'} {team || 'Sem escolha'}</span>
                    {team && (isCorrect ? '🎯' : '❌')}
                  </div>
                ) : (
                  <select
                    value={team}
                    disabled={options.length === 0}
                    onChange={(e) => handleSelect('finalists', i, e.target.value)}
                    className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                  >
                    <option value="">Selecione o finalista #{i+1}...</option>
                    {options.map(t => (
                      <option key={t} value={t} disabled={localBracket.finalists.includes(t) && t !== team}>
                        {TEAM_FLAGS[t]} {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Grande Campeão (1 Vaga) */}
        <div className="glass-panel p-5 rounded-2xl border-2 border-football-gold flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-football-gold/5 rounded-full blur-lg"></div>
          <h3 className="font-extrabold text-sm text-football-gold uppercase tracking-widest border-b border-football-gold/20 pb-2 flex justify-between select-none">
            <span>Campeão (10 pts)</span>
            {hasActualResults && <span>+{championPts} pts</span>}
          </h3>
          <div className="flex flex-col gap-1">
            {hasActualResults ? (
              <div className={`p-3 rounded-xl text-sm font-black border flex items-center justify-between select-none ${
                localBracket.champion === actual.champion ? 'bg-football-gold/15 border-football-gold/40 text-football-gold' : 'bg-black/30 border-white/5 text-slate-500'
              }`}>
                <span className="truncate">{TEAM_FLAGS[localBracket.champion] || '🏳️'} {localBracket.champion || 'Sem escolha'}</span>
                {localBracket.champion && (localBracket.champion === actual.champion ? '👑' : '❌')}
              </div>
            ) : (
              <select
                value={localBracket.champion}
                disabled={localBracket.finalists.filter(t => t !== '').length === 0}
                onChange={(e) => handleSelect('champion', null, e.target.value)}
                className="p-3 rounded-xl glass-input text-sm font-extrabold w-full border-football-gold/40 focus:border-football-gold"
              >
                <option value="">Campeão da Copa...</option>
                {localBracket.finalists.filter(t => t !== '').map(t => (
                  <option key={t} value={t}>
                    {TEAM_FLAGS[t]} {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Comparativo Oficial de Campeão */}
          {hasActualResults && (
            <div className="mt-4 p-3 rounded-xl bg-football-gold/10 border border-football-gold/20 text-center select-none">
              <p className="text-[10px] uppercase font-bold text-slate-400">Campeão Oficial</p>
              <p className="font-black text-football-gold text-base mt-1">
                {TEAM_FLAGS[actual.champion] || '🏳️'} {actual.champion}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
