import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, Clock, Lock } from 'lucide-react';
import { saveGuess } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';
import { calculateMatchScore } from '../services/points';

export const checkIsPlaceholder = (teamName) => {
  if (!teamName) return true;
  const name = teamName.toString();
  return name.includes('16-avos') || 
         name.includes('Oitavas') || 
         name.includes('Quartas') || 
         name.includes('Semifinalista') || 
         name.includes('Perdedor') || 
         name.includes('Finalista') ||
         name.includes('1º') ||
         name.includes('2º') ||
         name.includes('3º') ||
         name.includes('Vencedor');
};

export default function Knockout({ matches, guesses, currentUser, onReload }) {
  const knockoutMatches = matches.filter(m => m.stage === 'knockout');
  
  // Ordenação fixa para as fases do mata-mata
  const STAGE_ORDER = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Final"];
  
  const stagesList = STAGE_ORDER.filter(s => knockoutMatches.some(m => m.group === s));
  const [selectedStage, setSelectedStage] = useState(stagesList[0] || "Oitavas de Final");

  const [localGuesses, setLocalGuesses] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const initialGuesses = {};
    matches.forEach(m => {
      const userGuess = guesses.find(g => g.user === currentUser && String(g.matchId) === String(m.id));
      if (userGuess) {
        initialGuesses[m.id] = {
          homeScore: userGuess.homeScore ?? '',
          awayScore: userGuess.awayScore ?? ''
        };
      } else {
        initialGuesses[m.id] = { homeScore: '', awayScore: '' };
      }
    });
    setLocalGuesses(initialGuesses);
  }, [matches, guesses, currentUser]);

  const handleScoreChange = (matchId, team, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setLocalGuesses(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
    setSaveStatus(null);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const promises = Object.entries(localGuesses).map(async ([matchId, scores]) => {
        const match = matches.find(m => String(m.id) === String(matchId));
        if (match && (match.locked || (match.homeScore !== null && match.awayScore !== null))) {
          return;
        }
        if (match && (checkIsPlaceholder(match.homeTeam) || checkIsPlaceholder(match.awayTeam))) {
          return;
        }
        const home = scores.homeScore;
        const away = scores.awayScore;
        if ((home !== '' && away !== '') || (home === '' && away === '')) {
          await saveGuess(currentUser, matchId, home, away);
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    let cleanDate = dateString;
    const tIndex = dateString.indexOf('T');
    if (tIndex !== -1) {
      cleanDate = dateString.substring(0, tIndex + 9);
    }
    const formattedString = cleanDate.includes('T') ? `${cleanDate}-03:00` : `${cleanDate}T00:00:00-03:00`;
    const date = new Date(formattedString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const filteredMatches = knockoutMatches.filter(m => m.group === selectedStage);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            🏆 Mata-mata (Fase Final)
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Palpite nas chaves decisivas da Copa. Atenção: gols na prorrogação contam no placar final oficial!
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-football-vibrantGreen to-emerald-600 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save size={18} />
          )}
          <span>Salvar Palpites</span>
        </button>
      </div>

      {/* Alertas de Gravação */}
      {saveStatus === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <Check size={18} />
          <span>Palpites do mata-mata salvos com sucesso!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} />
          <span>Ocorreu um erro ao salvar palpites. Tente novamente!</span>
        </div>
      )}

      {/* Seletor de Fases */}
      <div className="flex gap-2 border-b border-white/5 pb-4 mb-8 overflow-x-auto no-scrollbar scroll-smooth">
        {stagesList.map((stage) => (
          <button
            key={stage}
            onClick={() => {
              setSelectedStage(stage);
              setSaveStatus(null);
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              selectedStage === stage
                ? 'bg-football-royalBlue text-white shadow-md shadow-blue-500/20 scale-105 font-extrabold'
                : 'glass-panel text-slate-300 hover:text-white hover:bg-white/5 border border-football-glassBorder'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Grid de Partidas */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMatches.map(match => {
            const guess = localGuesses[match.id] || { homeScore: '', awayScore: '' };
            const isLocked = match.locked || (match.homeScore !== null && match.awayScore !== null);
            const hasResult = match.homeScore !== null && match.awayScore !== null;
            
            let pointsEarned = null;
            let pointsBadgeColor = '';
            let pointsText = '';

            if (hasResult) {
              const dbGuess = guesses.find(g => g.user === currentUser && String(g.matchId) === String(match.id));
              if (dbGuess) {
                const scoreResult = calculateMatchScore(dbGuess.homeScore, dbGuess.awayScore, match.homeScore, match.awayScore);
                pointsEarned = scoreResult.points;
                if (scoreResult.points === 10) {
                  pointsBadgeColor = 'bg-football-gold/20 text-football-gold border border-football-gold/30 text-glow-gold';
                  pointsText = 'Placar Exato (+10 pts) 🎯';
                } else if (scoreResult.points === 7) {
                  pointsBadgeColor = 'bg-football-royalBlue/20 text-football-lightBlue border border-football-royalBlue/30';
                  pointsText = 'Vencedor & Saldo (+7 pts) ⚖️';
                } else if (scoreResult.points === 5) {
                  pointsBadgeColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
                  const isDraw = parseInt(match.homeScore, 10) === parseInt(match.awayScore, 10);
                  pointsText = isDraw ? 'Acertou Empate (+5 pts) 🤝' : 'Acertou Vencedor (+5 pts) 👍';
                } else {
                  pointsBadgeColor = 'bg-slate-500/15 text-slate-400 border border-slate-500/25';
                  pointsText = 'Não pontuou (0 pts) ❌';
                }
              } else {
                pointsBadgeColor = 'bg-slate-500/15 text-slate-400 border border-slate-500/25';
                pointsText = 'Sem palpite (0 pts)';
              }
            }

            const isPlaceholder = checkIsPlaceholder(match.homeTeam) || checkIsPlaceholder(match.awayTeam);

            return (
              <div key={match.id} className={`glass-panel p-5 rounded-2xl border transition-all duration-300 ${
                isLocked ? 'border-white/5 opacity-80' : 'border-football-glassBorder hover:border-football-vibrantGreen/40'
              }`}>
                {/* Cabeçalho */}
                <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                  <span className="font-bold text-football-royalBlue bg-football-royalBlue/10 px-2.5 py-0.5 rounded">
                    {match.group}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(match.date)}
                  </span>
                </div>

                {/* Times Layout */}
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-4xl mb-2 filter drop-shadow-md select-none">
                      {TEAM_FLAGS[match.homeTeam] || "🏳️"}
                    </span>
                    <span className={`font-bold text-sm md:text-base truncate max-w-[120px] md:max-w-none ${isPlaceholder ? 'text-slate-500 italic' : 'text-white'}`}>
                      {match.homeTeam}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLocked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl font-black text-slate-300 bg-black/30 w-10 h-10 flex items-center justify-center rounded-lg">
                          {guess.homeScore !== '' ? guess.homeScore : '-'}
                        </span>
                        <span className="text-slate-500 font-bold">x</span>
                        <span className="text-xl md:text-2xl font-black text-slate-300 bg-black/30 w-10 h-10 flex items-center justify-center rounded-lg">
                          {guess.awayScore !== '' ? guess.awayScore : '-'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength="2"
                          disabled={isPlaceholder}
                          value={isPlaceholder ? '' : guess.homeScore}
                          onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
                          className={`w-12 h-12 rounded-xl text-center text-xl font-extrabold glass-input ${isPlaceholder ? 'opacity-30 cursor-not-allowed bg-black/10' : 'focus:scale-105'}`}
                          placeholder="-"
                        />
                        <span className={`${isPlaceholder ? 'text-slate-600' : 'text-football-royalBlue/60'} font-bold`}>x</span>
                        <input
                          type="text"
                          maxLength="2"
                          disabled={isPlaceholder}
                          value={isPlaceholder ? '' : guess.awayScore}
                          onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
                          className={`w-12 h-12 rounded-xl text-center text-xl font-extrabold glass-input ${isPlaceholder ? 'opacity-30 cursor-not-allowed bg-black/10' : 'focus:scale-105'}`}
                          placeholder="-"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-4xl mb-2 filter drop-shadow-md select-none">
                      {TEAM_FLAGS[match.awayTeam] || "🏳️"}
                    </span>
                    <span className={`font-bold text-sm md:text-base truncate max-w-[120px] md:max-w-none ${isPlaceholder ? 'text-slate-500 italic' : 'text-white'}`}>
                      {match.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Resultado ou palpites salvos */}
                {hasResult ? (
                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Resultado Real:</span>
                      <span className="bg-football-gold text-football-darkGreen font-extrabold px-2 py-0.5 rounded text-sm shadow">
                        {match.homeScore} x {match.awayScore}
                      </span>
                    </div>
                    <div className={`text-center py-1.5 px-3 rounded-lg text-xs font-bold ${pointsBadgeColor}`}>
                      {pointsText}
                    </div>
                  </div>
                ) : isLocked ? (
                  <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-center gap-2 text-xs text-rose-400 font-bold">
                    <Lock size={12} />
                    <span>Palpites encerrados — partida em andamento</span>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-football-glassBorder flex items-center justify-between text-xs text-slate-400">
                    {isPlaceholder ? (
                      <span className="flex items-center gap-1 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <Lock size={12} className="text-slate-500" />
                        Confronto Indefinido
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-football-royalBlue" />
                          Aguardando início
                        </span>
                        {guess.homeScore !== '' && guess.awayScore !== '' && (
                          <span className="text-football-royalBlue font-bold bg-football-royalBlue/10 px-2 py-0.5 rounded">
                            Palpite preenchido
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 glass-panel rounded-2xl border border-football-glassBorder text-slate-400">
          Nenhuma partida de mata-mata disponível para esta rodada.
        </div>
      )}
    </div>
  );
}
