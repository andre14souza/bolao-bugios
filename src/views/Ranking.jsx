import React from 'react';
import { Target, Check, Trophy, Calendar, Award, Star, Compass } from 'lucide-react';
import { computeRanking } from '../services/api';

export default function Ranking({ users, matches, guesses, groupQualifiers, bracketGuesses, oracle }) {
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
              <span className="font-extrabold text-sm md:text-base text-white truncate max-w-[80px] md:max-w-none">
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
              <span className="font-extrabold text-base md:text-lg text-football-gold truncate max-w-[85px] md:max-w-none">
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
              <span className="font-extrabold text-sm md:text-base text-white truncate max-w-[80px] md:max-w-none">
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
                        <span className={nameClass}>
                          {row.user}
                        </span>
                        {isFirst && <span className="text-lg animate-pulse" title="Líder do Bolão">👑</span>}
                        {isLast && <span className="text-lg" title="Lanterna - Tartaruga">🐢</span>}
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
    </div>
  );
}
