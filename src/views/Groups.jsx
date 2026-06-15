import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, Clock } from 'lucide-react';
import { saveGuess } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';
import { calculateMatchScore } from '../services/points';

export default function Groups({ matches, guesses, currentUser, onReload }) {
  const groupMatches = matches.filter(m => m.stage === 'group');
  
  // Encontra todos os grupos únicos
  const groupsList = Array.from(new Set(groupMatches.map(m => m.group))).sort();
  const [selectedGroup, setSelectedGroup] = useState(groupsList[0] || 'Grupo A');

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
        if (match && match.homeScore !== null && match.awayScore !== null) {
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
    let formattedString = dateString;
    const hasTimezone = dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString);
    if (!hasTimezone) {
      formattedString = dateString.includes('T') ? `${dateString}-03:00` : `${dateString}T00:00:00-03:00`;
    }
    const date = new Date(formattedString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const filteredMatches = groupMatches.filter(m => m.group === selectedGroup);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            🏆 Fase de Grupos
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Navegue pelos grupos da Copa do Mundo de 2026 e insira seus palpites para cada rodada.
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
          <span>Palpites do grupo salvos com sucesso!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} />
          <span>Ocorreu um erro ao salvar palpites. Tente novamente!</span>
        </div>
      )}

      {/* Seletor de Grupos Horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
        {groupsList.map((g) => (
          <button
            key={g}
            onClick={() => {
              setSelectedGroup(g);
              setSaveStatus(null);
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
              selectedGroup === g
                ? 'bg-football-gold text-football-darkGreen shadow-md shadow-amber-500/20 scale-105 font-extrabold'
                : 'glass-panel text-slate-300 hover:text-white hover:bg-white/5 border border-football-glassBorder'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Grid de Partidas */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMatches.map(match => {
            const guess = localGuesses[match.id] || { homeScore: '', awayScore: '' };
            const isLocked = match.homeScore !== null && match.awayScore !== null;
            
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
                pointsBadgeColor = 'bg-slate-500/15 text-slate-400 border border-slate-500/25';
                pointsText = 'Sem palpite (0 pts)';
              }
            }

            return (
              <div key={match.id} className={`glass-panel p-5 rounded-2xl border transition-all duration-300 ${
                isLocked ? 'border-white/5 opacity-80' : 'border-football-glassBorder hover:border-football-vibrantGreen/40'
              }`}>
                {/* Cabeçalho */}
                <div className="flex justify-between items-center text-xs text-slate-400 mb-4">
                  <span className="font-semibold text-football-vibrantGreen">
                    Partida #{match.id}
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
                    <span className="font-bold text-sm md:text-base text-white truncate max-w-[100px] md:max-w-none">
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
                          value={guess.homeScore}
                          onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
                          className="w-12 h-12 rounded-xl text-center text-xl font-extrabold glass-input focus:scale-105"
                          placeholder="-"
                        />
                        <span className="text-football-vibrantGreen/60 font-bold">x</span>
                        <input
                          type="text"
                          maxLength="2"
                          value={guess.awayScore}
                          onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
                          className="w-12 h-12 rounded-xl text-center text-xl font-extrabold glass-input focus:scale-105"
                          placeholder="-"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-4xl mb-2 filter drop-shadow-md select-none">
                      {TEAM_FLAGS[match.awayTeam] || "🏳️"}
                    </span>
                    <span className="font-bold text-sm md:text-base text-white truncate max-w-[100px] md:max-w-none">
                      {match.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Resultado ou palpites salvos */}
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
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-football-brightYellow" />
                      Aguardando início
                    </span>
                    {guess.homeScore !== '' && guess.awayScore !== '' && (
                      <span className="text-football-vibrantGreen font-bold bg-football-vibrantGreen/10 px-2 py-0.5 rounded">
                        Palpite preenchido
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 glass-panel rounded-2xl border border-football-glassBorder text-slate-400">
          Nenhuma partida de grupo cadastrada para este grupo.
        </div>
      )}
    </div>
  );
}
