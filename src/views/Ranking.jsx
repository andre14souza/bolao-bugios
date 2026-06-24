import React, { useState } from 'react';
import { Target, Check, Trophy, Calendar, Award, Star, Compass, X } from 'lucide-react';
import { computeRanking } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';
import { isMatchTimeOver, calculateMatchScore } from '../services/points';

export default function Ranking({ users, matches, guesses, groupQualifiers, bracketGuesses, oracle, onSelectMatchForStats }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const ranking = computeRanking(users || [], matches, guesses, groupQualifiers, bracketGuesses, oracle);

  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];
  
  const lastIndex = ranking.length - 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="text-center mb-8 select-none">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white flex justify-center items-center gap-2">
          📊 Ranking Geral em Tempo Real
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          A classificação soma os pontos das partidas, dos avanços da Fase de Grupos, do chaveamento do Mata-mata e dos bônus acertados no Oráculo.
        </p>
      </div>

      {/* Pódio visual para os Top 3 */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mb-10 items-end pt-4 select-none">
          {/* 2º Lugar */}
          <div className="flex flex-col items-center">
            <div className="bg-slate-400/20 text-slate-300 px-3 py-1 rounded-full border border-slate-400/30 mb-2 font-bold text-xs">
              2º
            </div>
            <div className="w-full glass-panel p-4 rounded-t-2xl border-t-2 border-slate-400 flex flex-col items-center justify-center text-center h-28 md:h-36">
              <span 
                onClick={() => setSelectedUser(second.user)}
                className="font-extrabold text-sm md:text-base text-white truncate max-w-[80px] md:max-w-none hover:text-football-gold cursor-pointer underline decoration-dotted underline-offset-4 decoration-slate-500"
              >
                {second.user}
              </span>
              <span className="text-slate-400 text-[10px] md:text-xs mt-1 font-semibold">🥈 Prata</span>
              <span className="text-lg md:text-xl font-black text-slate-300 mt-2">
                {second.points} <span className="text-xs font-semibold">pts</span>
              </span>
            </div>
          </div>

          {/* 1º Lugar - Campeão */}
          <div className="flex flex-col items-center">
            <div className="bg-football-gold/20 text-football-gold px-4 py-1.5 rounded-full border border-football-gold/30 mb-2 font-bold text-sm relative animate-bounce-slow">
              👑 1º
            </div>
            <div className="w-full glass-panel p-4 rounded-t-3xl border-t-4 border-football-gold flex flex-col items-center justify-center text-center h-36 md:h-44 relative overflow-hidden pulse-gold-glow">
              <div className="absolute top-0 right-0 w-12 h-12 bg-football-gold/5 rounded-full blur-lg"></div>
              <span 
                onClick={() => setSelectedUser(first.user)}
                className="font-extrabold text-base md:text-lg text-football-gold truncate max-w-[85px] md:max-w-none hover:text-amber-400 cursor-pointer underline decoration-dotted underline-offset-4 decoration-football-gold/50"
              >
                {first.user}
              </span>
              <span className="text-football-brightYellow text-[10px] md:text-xs mt-1 font-bold">🥇 Ouro</span>
              <span className="text-2xl md:text-3xl font-black text-white text-glow-gold mt-2">
                {first.points} <span className="text-xs font-semibold text-slate-400">pts</span>
              </span>
            </div>
          </div>

          {/* 3º Lugar */}
          <div className="flex flex-col items-center">
            <div className="bg-amber-600/20 text-amber-500 px-3 py-1 rounded-full border border-amber-600/30 mb-2 font-bold text-xs">
              3º
            </div>
            <div className="w-full glass-panel p-4 rounded-t-2xl border-t-2 border-amber-600 flex flex-col items-center justify-center text-center h-24 md:h-32">
              <span 
                onClick={() => setSelectedUser(third.user)}
                className="font-extrabold text-sm md:text-base text-white truncate max-w-[80px] md:max-w-none hover:text-football-gold cursor-pointer underline decoration-dotted underline-offset-4 decoration-slate-500"
              >
                {third.user}
              </span>
              <span className="text-amber-500 text-[10px] md:text-xs mt-1 font-semibold">🥉 Bronze</span>
              <span className="text-lg md:text-xl font-black text-amber-500 mt-2">
                {third.points} <span className="text-xs font-semibold">pts</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Classificação Detalhada */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-football-glassBorder shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-football-grassGreen/20 border-b border-football-glassBorder text-xs font-bold uppercase tracking-wider text-slate-300">
                <th className="py-4 px-3 text-center w-12">Pos</th>
                <th className="py-4 px-4 min-w-[120px]">Amigo</th>
                <th className="py-4 px-3 text-center font-black text-white">Pontos Totais</th>
                <th className="py-4 px-3 text-center">⚽ Jogos</th>
                <th className="py-4 px-3 text-center">📋 Grupos</th>
                <th className="py-4 px-3 text-center">🏆 Mata-mata</th>
                <th className="py-4 px-3 text-center">🔮 Oráculo</th>
                <th className="py-4 px-3 text-center">🎯 Moscas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ranking.map((row, index) => {
                const isFirst = index === 0;
                const isLast = index === lastIndex;

                let rowBgClass = "hover:bg-white/5 transition-colors";
                let nameClass = "font-bold text-white text-sm md:text-base";
                let posBadge = '';

                if (isFirst) {
                  rowBgClass = "bg-football-gold/5 hover:bg-football-gold/10 transition-all";
                  nameClass = "font-extrabold text-football-gold text-base";
                  posBadge = 'bg-football-gold text-football-darkGreen font-extrabold';
                } else if (isLast) {
                  rowBgClass = "bg-rose-500/5 hover:bg-rose-500/10 transition-all";
                  nameClass = "font-medium text-slate-400 text-sm";
                  posBadge = 'bg-rose-500/20 text-rose-300 font-bold';
                } else {
                  posBadge = 'bg-slate-700/50 text-slate-300 font-semibold';
                }

                return (
                  <tr key={row.user} className={rowBgClass}>
                    {/* Pos */}
                    <td className="py-4 px-3 text-center">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm ${posBadge}`}>
                        {index + 1}
                      </span>
                    </td>

                    {/* Amigo + ícone */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => setSelectedUser(row.user)}
                          className={`${nameClass} hover:text-football-gold cursor-pointer underline decoration-dotted underline-offset-4 decoration-slate-500`}
                        >
                          {row.user}
                        </span>
                        {isFirst && <span className="text-lg animate-pulse" title="Líder do Bolão">👑</span>}
                        {isLast && <span className="text-lg" title="Lanterna - Tartaruga">🐢</span>}
                        {row.penaltyPoints > 0 && (
                          <span 
                            className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold"
                            title="Penalidade aplicada"
                          >
                            -{row.penaltyPoints} pts ⚠️
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pontos Totais */}
                    <td className="py-4 px-3 text-center">
                      <span className={`text-base md:text-lg font-black ${isFirst ? 'text-football-gold text-glow-gold' : 'text-white'}`}>
                        {row.points}
                      </span>
                    </td>

                    {/* Pontos Jogos */}
                    <td className="py-4 px-3 text-center font-bold text-slate-300 text-sm">
                      {row.matchPoints}
                    </td>

                    {/* Pontos Grupos */}
                    <td className="py-4 px-3 text-center font-bold text-football-brightYellow text-sm">
                      {row.groupPoints}
                    </td>

                    {/* Pontos Mata-mata */}
                    <td className="py-4 px-3 text-center font-bold text-football-royalBlue text-sm">
                      {row.bracketPoints}
                    </td>

                    {/* Pontos Oráculo */}
                    <td className="py-4 px-3 text-center font-bold text-pink-400 text-sm">
                      {row.oraclePoints}
                    </td>

                    {/* Acertos na Mosca */}
                    <td className="py-4 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-football-gold font-bold text-sm">
                        <Star size={12} className="fill-football-gold" />
                        <span>{row.exactMatches}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Penalidades / Advertências */}
      {ranking.some(r => r.penaltyPoints > 0) && (
        <div className="mt-6 p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs select-none">
          <h4 className="font-extrabold text-sm text-rose-400 mb-2 flex items-center gap-1.5">
            <span>⚠️</span> Penalidades Aplicadas
          </h4>
          <ul className="list-disc pl-4 space-y-1">
            {ranking.filter(r => r.penaltyPoints > 0).map(r => (
              <li key={r.user}>
                O usuário <strong>{r.user}</strong> sofreu uma redução de <strong>{r.penaltyPoints} pontos</strong> por irregularidade em palpite de empate.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regras e Pontuações */}
      <div className="mt-8 glass-panel p-6 rounded-3xl border border-football-glassBorder select-none">
        <h3 className="font-extrabold text-lg text-white mb-4 flex items-center gap-2">
          <span>ℹ️</span> Divisão e Critérios de Pontuação
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-300">
          {/* Jogos */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="font-extrabold text-sm text-football-vibrantGreen mb-1">⚽ Partidas por Rodada</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Placar Exato: <strong>10 pts</strong></li>
              <li>Vencedor e Saldo: <strong>7 pts</strong></li>
              <li>Apenas Vencedor: <strong>5 pts</strong></li>
              <li>Empate s/ placar exato: <strong>5 pts</strong></li>
            </ul>
          </div>

          {/* Grupos */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="font-extrabold text-sm text-football-brightYellow mb-1">📋 Classificados Grupo</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Acertar 1º ou 2º exato: <strong>5 pts</strong></li>
              <li>Classifica em posição invertida: <strong>3 pts</strong></li>
            </ul>
          </div>

          {/* Mata-mata */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="font-extrabold text-sm text-football-royalBlue mb-1">🏆 Chaveamento Mata-mata</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Acertar Quartas: <strong>2 pts / time</strong></li>
              <li>Acertar Semis: <strong>4 pts / time</strong></li>
              <li>Acertar Finalistas: <strong>8 pts / time</strong></li>
              <li>Acertar Campeão: <strong>10 pts</strong></li>
            </ul>
          </div>

          {/* Oráculo */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
            <h4 className="font-extrabold text-sm text-pink-400 mb-1">🔮 Perguntas Oráculo</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Cada resposta correta nos bônus: <strong>5 pts</strong></li>
              <li>*Edição trancada imediatamente no início da Copa.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Palpites do Usuário */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-football-glassBorder relative shadow-2xl flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2 border-b border-white/5 pb-3 pr-8 select-none">
              <span>📊</span> Palpites de {selectedUser} (Histórico)
            </h2>

            <div className="overflow-y-auto pr-1 flex-1 space-y-4 py-2 no-scrollbar">
              {(() => {
                const finishedMatches = matches.filter(match => 
                  match.locked || isMatchTimeOver(match.date) || (match.homeScore !== null && match.awayScore !== null)
                ).sort((a, b) => new Date(a.date) - new Date(b.date));

                if (finishedMatches.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 select-none">
                      Nenhuma partida finalizada ou em andamento ainda para exibir palpites.
                    </div>
                  );
                }

                return finishedMatches.map(match => {
                  const guess = guesses.find(g => g.user === selectedUser && String(g.matchId) === String(match.id));
                  const hasResult = match.homeScore !== null && match.awayScore !== null;
                  
                  let pointsBadgeColor = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
                  let pointsText = 'Sem palpite (0 pts)';

                  if (hasResult) {
                    if (guess) {
                      const scoreResult = calculateMatchScore(guess.homeScore, guess.awayScore, match.homeScore, match.awayScore);
                      if (scoreResult.points === 10) {
                        pointsBadgeColor = 'bg-football-gold/20 text-football-gold border border-football-gold/30 text-glow-gold';
                        pointsText = 'Placar Exato (+10 pts) 🎯';
                      } else if (scoreResult.points === 7) {
                        pointsBadgeColor = 'bg-football-royalBlue/20 text-football-lightBlue border border-football-royalBlue/30';
                        pointsText = 'Vencedor & Saldo (+7 pts) ⚖️';
                      } else if (scoreResult.points === 5) {
                        pointsBadgeColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
                        const isDraw = parseInt(match.homeScore, 10) === parseInt(match.awayScore, 10);
                        pointsText = isDraw ? 'Empate (+5 pts) 🤝' : 'Vencedor (+5 pts) 👍';
                      } else {
                        pointsBadgeColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                        pointsText = 'Não pontuou (0 pts) ❌';
                      }
                    }
                  } else {
                    pointsBadgeColor = 'bg-football-brightYellow/10 text-football-brightYellow border border-football-brightYellow/20';
                    pointsText = 'Partida em andamento ⏳';
                  }

                  return (
                    <div key={match.id} className="p-4 rounded-2xl border border-football-glassBorder bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Times e Palpite */}
                      <div className="flex-1 flex items-center justify-between sm:justify-start gap-4">
                        <div className="flex items-center gap-2 min-w-[120px] sm:min-w-[150px]">
                          <span className="text-2xl filter drop-shadow select-none">{TEAM_FLAGS[match.homeTeam] || "🏳️"}</span>
                          <span className="text-xs font-bold text-white truncate max-w-[80px] sm:max-w-none">{match.homeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center min-w-[70px]">
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 select-none">Palpite</span>
                          <span className="text-sm font-black text-white px-2 py-0.5 bg-black/30 rounded border border-white/5">
                            {guess ? `${guess.homeScore} x ${guess.awayScore}` : '- x -'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 min-w-[120px] sm:min-w-[150px] justify-end">
                          <span className="text-xs font-bold text-white truncate max-w-[80px] sm:max-w-none">{match.awayTeam}</span>
                          <span className="text-2xl filter drop-shadow select-none">{TEAM_FLAGS[match.awayTeam] || "🏳️"}</span>
                        </div>
                      </div>

                      {/* Resultado Real e Pontuação */}
                      <div className="flex flex-col items-end sm:min-w-[160px] justify-center text-right border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-4 gap-1.5">
                        {hasResult ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase select-none">Resultado:</span>
                            <span className="bg-football-gold text-football-darkGreen font-extrabold px-1.5 py-0.5 rounded text-xs shadow">
                              {match.homeScore} x {match.awayScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase select-none font-mono">Em Andamento</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(null);
                              onSelectMatchForStats(match);
                            }}
                            className="text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1"
                            title="Ver palpites de todos os participantes"
                          >
                            <span>📊 Stats</span>
                          </button>
                          <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full border ${pointsBadgeColor} select-none`}>
                            {pointsText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="border-t border-white/5 pt-4 mt-3 flex justify-end">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
