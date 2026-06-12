import React, { useState, useEffect } from 'react';
import { Save, Lock, Check, Clock, AlertCircle } from 'lucide-react';
import { saveGuess } from '../services/api';
import { calculateMatchScore } from '../services/points';
import { checkIsPlaceholder } from './Knockout';

import { TEAM_FLAGS } from '../services/flags';
export { TEAM_FLAGS };

export default function DailyMatches({ matches, guesses, currentUser, onReload }) {
  // Local state for scores inputs
  const [localGuesses, setLocalGuesses] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null

  // Pre-fill local guesses from props when guesses or matches change
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
    // Only numeric input or empty
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
      // Save all non-empty modified guesses
      const promises = Object.entries(localGuesses).map(async ([matchId, scores]) => {
        const match = matches.find(m => String(m.id) === String(matchId));
        // Don't save if match already has score (locked)
        if (match && match.homeScore !== null && match.awayScore !== null) {
          return;
        }
        // Don't save if match is an undefined placeholder matchup
        if (match && (checkIsPlaceholder(match.homeTeam) || checkIsPlaceholder(match.awayTeam))) {
          return;
        }

        const home = scores.homeScore;
        const away = scores.awayScore;

        // Save only if both scores are filled or both are empty (to clear guess)
        if ((home !== '' && away !== '') || (home === '' && away === '')) {
          await saveGuess(currentUser, matchId, home, away);
        }
      });

      await Promise.all(promises);
      setSaveStatus('success');
      onReload(); // Refresh global database state
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter for today's matches (e.g. same day)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const todayMatches = matches.filter(m => m.date.startsWith(todayStr));
  const otherMatches = matches.filter(m => !m.date.startsWith(todayStr));

  const renderMatchCard = (match) => {
    const guess = localGuesses[match.id] || { homeScore: '', awayScore: '' };
    const isLocked = match.homeScore !== null && match.awayScore !== null;
    const isPlaceholder = checkIsPlaceholder(match.homeTeam) || checkIsPlaceholder(match.awayTeam);
    
    // Calculate points earned if locked
    let pointsEarned = null;
    let pointsBadgeColor = '';
    let pointsText = '';

    if (isLocked) {
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
        pointsEarned = 0;
        pointsBadgeColor = 'bg-slate-500/15 text-slate-400 border border-slate-500/25';
        pointsText = 'Sem palpite (0 pts)';
      }
    }

    return (
      <div key={match.id} className={`glass-panel p-5 rounded-2xl border transition-all duration-300 ${
        isLocked ? 'border-white/5 opacity-90' : 'border-football-glassBorder hover:border-football-vibrantGreen/40 shadow-lg'
      }`}>
        {/* Header Info */}
        <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
          <span className="bg-football-grassGreen/30 text-football-vibrantGreen px-2.5 py-0.5 rounded-full font-bold uppercase">
            {match.group}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDate(match.date)}
          </span>
        </div>

        {/* Teams and Inputs Layout */}
        <div className="flex items-center justify-between gap-4 py-2">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <span className="text-4xl mb-2 filter drop-shadow-md select-none">
              {TEAM_FLAGS[match.homeTeam] || "🏳️"}
            </span>
            <span className={`font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-none ${isPlaceholder ? 'text-slate-500 italic' : 'text-white'}`}>
              {match.homeTeam}
            </span>
          </div>

          {/* Scores/Inputs */}
          <div className="flex items-center gap-3">
            {isLocked ? (
              // Locked Guess View
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
              // Editable Guess Inputs
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
                <span className={`${isPlaceholder ? 'text-slate-600' : 'text-football-vibrantGreen/60'} font-bold`}>x</span>
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

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 text-center">
            <span className="text-4xl mb-2 filter drop-shadow-md select-none">
              {TEAM_FLAGS[match.awayTeam] || "🏳️"}
            </span>
            <span className={`font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-none ${isPlaceholder ? 'text-slate-500 italic' : 'text-white'}`}>
              {match.awayTeam}
            </span>
          </div>
        </div>

        {/* Results / Points Earned footer */}
        {isLocked ? (
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
                  <Clock size={12} className="text-football-brightYellow" />
                  Aguardando início
                </span>
                {guess.homeScore !== '' && guess.awayScore !== '' && (
                  <span className="text-football-vibrantGreen font-bold bg-football-vibrantGreen/10 px-2 py-0.5 rounded">
                    Palpite preenchido
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            ⚽ Jogos do Dia
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Insira os seus palpites de placar nos jogos abaixo e clique em salvar antes do início da partida.
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

      {/* Save Alerts */}
      {saveStatus === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <Check size={18} />
          <span>Palpites salvos com sucesso no banco de dados!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} />
          <span>Ocorreu um erro ao salvar palpites. Tente novamente!</span>
        </div>
      )}

      {/* Grid of Matches */}
      {todayMatches.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-football-brightYellow mb-4 border-b border-white/5 pb-2">
            🏆 Jogos de Hoje
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {todayMatches.map(renderMatchCard)}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 glass-panel rounded-2xl border border-football-glassBorder text-center">
          <p className="text-slate-300 font-medium text-base">
            📅 Sem jogos oficiais agendados para o dia de hoje.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Abaixo estão exibidos os próximos jogos da Copa do Mundo para você palpitar.
          </p>
        </div>
      )}

      {otherMatches.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/5 pb-2">
            📅 Próximos Jogos da Copa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {otherMatches.map(renderMatchCard)}
          </div>
        </div>
      )}
    </div>
  );
}
