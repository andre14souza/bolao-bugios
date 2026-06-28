import React, { useState, useEffect } from 'react';
import { Save, Check, Award, AlertCircle, Trophy, ArrowRight, Lock } from 'lucide-react';
import { saveBracket } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';
import { checkIsPlaceholder } from './Knockout';

export default function BracketPredictions({ matches, bracketGuesses, groupQualifiers, currentUser, onReload, isKnockoutDisabled }) {
  if (isKnockoutDisabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center select-none animate-fadeIn">
        <div className="glass-panel p-8 rounded-3xl border border-white/5 relative shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Chaveamento Bloqueado</h2>
          <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
            Os palpites para o chaveamento da fase eliminatória ainda não estão disponíveis. A liberação ocorrerá assim que todos os confrontos do mata-mata forem definidos.
          </p>
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
            Liberação em breve
          </div>
        </div>
      </div>
    );
  }

  const [localBracket, setLocalBracket] = useState({
    oitavas: Array(16).fill(''),
    quartas: Array(8).fill(''),
    semis: Array(4).fill(''),
    finalists: Array(2).fill(''),
    champion: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Carrega o palpite do usuário, se houver
  useEffect(() => {
    const userGuess = bracketGuesses.guesses.find(b => b.user === currentUser);
    if (userGuess) {
      setLocalBracket({
        oitavas: userGuess.oitavas || Array(16).fill(''),
        quartas: userGuess.quartas || Array(8).fill(''),
        semis: userGuess.semis || Array(4).fill(''),
        finalists: userGuess.finalists || Array(2).fill(''),
        champion: userGuess.champion || ''
      });
    } else {
      setLocalBracket({
        oitavas: Array(16).fill(''),
        quartas: Array(8).fill(''),
        semis: Array(4).fill(''),
        finalists: Array(2).fill(''),
        champion: ''
      });
    }
  }, [bracketGuesses, currentUser]);

  // Seeding dos times com base nos resultados oficiais do grupo (definidos pelo admin)
  const groupResultsMap = groupQualifiers?.results || {};

  const getTeamByRank = (groupName, rank) => {
    const group = groupResultsMap[groupName];
    if (!group) return `${rank}º do ${groupName}`;
    if (rank === 1) return group.first || `1º do ${groupName}`;
    if (rank === 2) return group.second || `2º do ${groupName}`;
    return group.third || `3º do ${groupName}`;
  };

  // Extração dos 8 melhores terceiros colocados oficiais
  const officialThirds = [];
  Object.entries(groupResultsMap).forEach(([groupName, picks]) => {
    if (picks.third) {
      officialThirds.push({
        teamName: picks.third,
        groupName: groupName
      });
    }
  });

  // Preenche com placeholders se faltarem terceiros colocados
  const paddedThirds = [...officialThirds];
  while (paddedThirds.length < 8) {
    paddedThirds.push({
      teamName: `3º Colocado #${paddedThirds.length + 1}`,
      groupName: `Placeholder ${paddedThirds.length + 1}`
    });
  }

  // Algoritmo de emparelhamento sem confrontos repetidos do mesmo grupo
  const winnersOrder = ['Grupo E', 'Grupo I', 'Grupo A', 'Grupo L', 'Grupo G', 'Grupo D', 'Grupo B', 'Grupo K'];

  const pairThirds = (thirds) => {
    const paired = Array(8).fill(null);
    const used = Array(8).fill(false);

    const backtrack = (idx) => {
      if (idx === 8) return true;
      const currentWinnerGroup = winnersOrder[idx];
      for (let i = 0; i < thirds.length; i++) {
        if (!used[i]) {
          const t = thirds[i];
          if (t.groupName !== currentWinnerGroup) {
            paired[idx] = t.teamName;
            used[i] = true;
            if (backtrack(idx + 1)) return true;
            used[i] = false;
            paired[idx] = null;
          }
        }
      }
      return false;
    };

    if (backtrack(0)) return paired;
    return thirds.map(t => t.teamName);
  };

  const pairedThirds = pairThirds(paddedThirds);

  // Helper para buscar time do confronto oficial (banco de dados) se não for placeholder
  const getMatchTeam = (matchId, side, fallback) => {
    const match = matches.find(m => String(m.id) === String(matchId));
    if (match && match.homeTeam && match.awayTeam && !checkIsPlaceholder(match.homeTeam) && !checkIsPlaceholder(match.awayTeam)) {
      return side === 'home' ? match.homeTeam : match.awayTeam;
    }
    return fallback;
  };

  // Definição dos 16 confrontos da rodada de 32 (16-avos de final)
  const r32Matches = [
    { id: 73, home: getMatchTeam(73, 'home', getTeamByRank('Grupo A', 2)), away: getMatchTeam(73, 'away', getTeamByRank('Grupo B', 2)), label: '16-avos' },
    { id: 74, home: getMatchTeam(74, 'home', getTeamByRank('Grupo C', 1)), away: getMatchTeam(74, 'away', getTeamByRank('Grupo F', 2)), label: '16-avos' },
    { id: 75, home: getMatchTeam(75, 'home', getTeamByRank('Grupo E', 1)), away: getMatchTeam(75, 'away', pairedThirds[0]), label: '16-avos' },
    { id: 76, home: getMatchTeam(76, 'home', getTeamByRank('Grupo F', 1)), away: getMatchTeam(76, 'away', getTeamByRank('Grupo C', 2)), label: '16-avos' },
    { id: 77, home: getMatchTeam(77, 'home', getTeamByRank('Grupo E', 2)), away: getMatchTeam(77, 'away', getTeamByRank('Grupo I', 2)), label: '16-avos' },
    { id: 78, home: getMatchTeam(78, 'home', getTeamByRank('Grupo I', 1)), away: getMatchTeam(78, 'away', pairedThirds[1]), label: '16-avos' },
    { id: 79, home: getMatchTeam(79, 'home', getTeamByRank('Grupo A', 1)), away: getMatchTeam(79, 'away', pairedThirds[2]), label: '16-avos' },
    { id: 80, home: getMatchTeam(80, 'home', getTeamByRank('Grupo L', 1)), away: getMatchTeam(80, 'away', pairedThirds[3]), label: '16-avos' },
    { id: 81, home: getMatchTeam(81, 'home', getTeamByRank('Grupo G', 1)), away: getMatchTeam(81, 'away', pairedThirds[4]), label: '16-avos' },
    { id: 82, home: getMatchTeam(82, 'home', getTeamByRank('Grupo D', 1)), away: getMatchTeam(82, 'away', pairedThirds[5]), label: '16-avos' },
    { id: 83, home: getMatchTeam(83, 'home', getTeamByRank('Grupo H', 1)), away: getMatchTeam(83, 'away', getTeamByRank('Grupo J', 2)), label: '16-avos' },
    { id: 84, home: getMatchTeam(84, 'home', getTeamByRank('Grupo K', 2)), away: getMatchTeam(84, 'away', getTeamByRank('Grupo L', 2)), label: '16-avos' },
    { id: 85, home: getMatchTeam(85, 'home', getTeamByRank('Grupo B', 1)), away: getMatchTeam(85, 'away', pairedThirds[6]), label: '16-avos' },
    { id: 86, home: getMatchTeam(86, 'home', getTeamByRank('Grupo D', 2)), away: getMatchTeam(86, 'away', getTeamByRank('Grupo G', 2)), label: '16-avos' },
    { id: 87, home: getMatchTeam(87, 'home', getTeamByRank('Grupo J', 1)), away: getMatchTeam(87, 'away', getTeamByRank('Grupo H', 2)), label: '16-avos' },
    { id: 88, home: getMatchTeam(88, 'home', getTeamByRank('Grupo K', 1)), away: getMatchTeam(88, 'away', pairedThirds[7]), label: '16-avos' }
  ];

  // Cascata recursiva: remove time alterado das fases subsequentes
  const removeTeamFromFutureStages = (updated, oldTeam) => {
    if (!oldTeam) return;
    updated.oitavas = updated.oitavas.map(t => t === oldTeam ? '' : t);
    updated.quartas = updated.quartas.map(t => t === oldTeam ? '' : t);
    updated.semis = updated.semis.map(t => t === oldTeam ? '' : t);
    updated.finalists = updated.finalists.map(t => t === oldTeam ? '' : t);
    if (updated.champion === oldTeam) updated.champion = '';
  };

  const handleSelect = (stage, index, selectedTeam) => {
    if (checkIsPlaceholder(selectedTeam)) return;

    setLocalBracket(prev => {
      const updated = { ...prev };
      
      if (stage === 'r32') {
        const oldTeam = prev.oitavas[index];
        updated.oitavas = [...prev.oitavas];
        updated.oitavas[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'oitavas') {
        const oldTeam = prev.quartas[index];
        updated.quartas = [...prev.quartas];
        updated.quartas[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'quartas') {
        const oldTeam = prev.semis[index];
        updated.semis = [...prev.semis];
        updated.semis[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'semis') {
        const oldTeam = prev.finalists[index];
        updated.finalists = [...prev.finalists];
        updated.finalists[index] = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
        }
      } else if (stage === 'final') {
        const oldTeam = prev.champion;
        updated.champion = selectedTeam;
        if (oldTeam && oldTeam !== selectedTeam) {
          removeTeamFromFutureStages(updated, oldTeam);
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
        localBracket.oitavas,
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

  // Informações de Resultados Oficiais
  const actual = bracketGuesses.results || { oitavas: [], quartas: [], semis: [], finalists: [], champion: null };
  const hasActualResults = (actual.oitavas && actual.oitavas.length > 0) || (actual.quartas && actual.quartas.length > 0) || (actual.semis && actual.semis.length > 0) || actual.champion !== null;

  // Cálculo de pontuação
  let oitavasPts = 0;
  let quartasPts = 0;
  let semisPts = 0;
  let finalistsPts = 0;
  let championPts = 0;

  if (hasActualResults) {
    localBracket.oitavas.forEach(t => {
      if (t && actual.oitavas?.includes(t)) oitavasPts += 2;
    });
    localBracket.quartas.forEach(t => {
      if (t && actual.quartas?.includes(t)) quartasPts += 4;
    });
    localBracket.semis.forEach(t => {
      if (t && actual.semis?.includes(t)) semisPts += 8;
    });
    localBracket.finalists.forEach(t => {
      if (t && actual.finalists?.includes(t)) finalistsPts += 12;
    });
    if (localBracket.champion && localBracket.champion === actual.champion) {
      championPts = 16;
    }
  }

  const totalBracketPoints = oitavasPts + quartasPts + semisPts + finalistsPts + championPts;

  // Componente de Cartão de Partida
  const MatchCard = ({ matchId, teamA, teamB, winner, onSelect, stageName, actualWinner }) => {
    const isA_Placeholder = checkIsPlaceholder(teamA);
    const isB_Placeholder = checkIsPlaceholder(teamB);
    const hasResult = actualWinner !== undefined && actualWinner !== null && actualWinner !== '';
    const isCorrect = hasResult && winner && winner === actualWinner;

    return (
      <div className={`glass-panel p-2.5 rounded-2xl border transition-all duration-300 w-[170px] md:w-[190px] relative flex flex-col gap-1.5 ${
        hasResult ? 'opacity-90 border-white/5' : 'border-zinc-800 hover:border-zinc-700'
      }`}>
        <div className="flex justify-between items-center text-[8px] font-bold text-zinc-400 border-b border-zinc-800 pb-1 select-none">
          <span className="uppercase tracking-wider">{stageName}</span>
          <span>Jogo {matchId}</span>
        </div>

        <div className="flex flex-col gap-1">
          {/* Time A */}
          <button
            disabled={isA_Placeholder || hasResult}
            onClick={() => onSelect(teamA)}
            className={`flex items-center justify-between p-1.5 rounded-xl text-[10px] w-full text-left transition-all ${
              winner === teamA && teamA
                ? 'bg-white text-zinc-950 font-extrabold border border-white'
                : winner && teamA
                ? 'opacity-40 text-zinc-400 hover:opacity-75 cursor-pointer border border-transparent'
                : isA_Placeholder
                ? 'opacity-30 text-zinc-500 italic cursor-not-allowed border border-transparent'
                : 'hover:bg-zinc-800 text-zinc-350 cursor-pointer border border-transparent'
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              <span className="text-sm filter drop-shadow select-none">{TEAM_FLAGS[teamA] || '🏳️'}</span>
              <span className="truncate">{teamA || 'A definir'}</span>
            </span>
            {winner === teamA && teamA && <span className="text-zinc-950 font-black text-[10px]">✓</span>}
          </button>

          {/* Time B */}
          <button
            disabled={isB_Placeholder || hasResult}
            onClick={() => onSelect(teamB)}
            className={`flex items-center justify-between p-1.5 rounded-xl text-[10px] w-full text-left transition-all ${
              winner === teamB && teamB
                ? 'bg-white text-zinc-950 font-extrabold border border-white'
                : winner && teamB
                ? 'opacity-40 text-zinc-400 hover:opacity-75 cursor-pointer border border-transparent'
                : isB_Placeholder
                ? 'opacity-30 text-zinc-500 italic cursor-not-allowed border border-transparent'
                : 'hover:bg-zinc-800 text-zinc-350 cursor-pointer border border-transparent'
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              <span className="text-sm filter drop-shadow select-none">{TEAM_FLAGS[teamB] || '🏳️'}</span>
              <span className="truncate">{teamB || 'A definir'}</span>
            </span>
            {winner === teamB && teamB && <span className="text-zinc-950 font-black text-[10px]">✓</span>}
          </button>
        </div>

        {hasResult && (
          <div className={`mt-0.5 pt-1 text-[7.5px] font-extrabold text-center rounded py-0.5 select-none ${
            isCorrect 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {isCorrect ? '🎯 CORRETO' : `❌ OFICIAL: ${actualWinner}`}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto px-4 py-8 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            🏆 Chaveamento da Copa 2026
          </h1>
          <p className="text-xs text-slate-350 mt-1">
            Clique na seleção que você acha que vence cada partida para avançá-la na chave. O mata-mata corre da esquerda para a direita!
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-6 py-3.5 rounded-2xl shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer text-xs md:text-sm whitespace-nowrap self-start md:self-auto"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save size={18} />
          )}
          <span>Salvar Meu Chaveamento</span>
        </button>
      </div>

      {/* Alertas de Feedback */}
      <div className="max-w-7xl mx-auto">
        {saveStatus === 'success' && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-xs font-semibold animate-slideDown">
            <Check size={18} />
            <span>Seu palpite de chaveamento foi salvo com sucesso!</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-xs font-semibold animate-slideDown">
            <AlertCircle size={18} />
            <span>Erro ao salvar chaveamento. Verifique se o servidor local está online.</span>
          </div>
        )}

        {/* Banner de Pontuação Apurada */}
        {hasActualResults && (
          <div className="mb-4 p-4 glass-panel rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <Award className="text-zinc-400 animate-bounce-slow" size={24} />
              <div>
                <p className="font-extrabold text-white text-sm">Mata-mata Apurado Oficial!</p>
                <p className="text-[10px] text-zinc-400">Pontuação obtida com base nas chaves concluídas.</p>
              </div>
            </div>
            <span className="text-base font-black text-white bg-zinc-850 px-3 py-1.5 rounded-xl border border-zinc-700">
              +{totalBracketPoints} pts
            </span>
          </div>
        )}

        {/* Instrução de Scroll Lateral */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none mb-2 animate-pulse">
          <span>Role para o lado para ver o chaveamento completo</span>
          <ArrowRight size={12} className="animate-bounce-horizontal" />
        </div>
      </div>

      {/* Árvore de Chaveamento Horizontal - Fluxo da Esquerda para a Direita */}
      <div className="w-full overflow-auto max-h-[70vh] border border-white/5 rounded-3xl bg-black/20 p-4 select-none scroll-smooth">
        <div className="flex gap-8 items-center min-w-[1400px] h-[1250px] px-4">
          
          {/* COLUNA 1: 16-avos de Final (16 jogos) */}
          <div className="flex flex-col justify-between h-full py-2">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-white/5 pb-2">16-avos (2 pts)</h3>
            <MatchCard matchId={73} teamA={r32Matches[0].home} teamB={r32Matches[0].away} winner={localBracket.oitavas[0]} onSelect={(team) => handleSelect('r32', 0, team)} stageName="16-avos" actualWinner={actual.oitavas?.[0]} />
            <MatchCard matchId={75} teamA={r32Matches[2].home} teamB={r32Matches[2].away} winner={localBracket.oitavas[2]} onSelect={(team) => handleSelect('r32', 2, team)} stageName="16-avos" actualWinner={actual.oitavas?.[2]} />
            <MatchCard matchId={74} teamA={r32Matches[1].home} teamB={r32Matches[1].away} winner={localBracket.oitavas[1]} onSelect={(team) => handleSelect('r32', 1, team)} stageName="16-avos" actualWinner={actual.oitavas?.[1]} />
            <MatchCard matchId={77} teamA={r32Matches[4].home} teamB={r32Matches[4].away} winner={localBracket.oitavas[4]} onSelect={(team) => handleSelect('r32', 4, team)} stageName="16-avos" actualWinner={actual.oitavas?.[4]} />
            <MatchCard matchId={76} teamA={r32Matches[3].home} teamB={r32Matches[3].away} winner={localBracket.oitavas[3]} onSelect={(team) => handleSelect('r32', 3, team)} stageName="16-avos" actualWinner={actual.oitavas?.[3]} />
            <MatchCard matchId={78} teamA={r32Matches[5].home} teamB={r32Matches[5].away} winner={localBracket.oitavas[5]} onSelect={(team) => handleSelect('r32', 5, team)} stageName="16-avos" actualWinner={actual.oitavas?.[5]} />
            <MatchCard matchId={79} teamA={r32Matches[6].home} teamB={r32Matches[6].away} winner={localBracket.oitavas[6]} onSelect={(team) => handleSelect('r32', 6, team)} stageName="16-avos" actualWinner={actual.oitavas?.[6]} />
            <MatchCard matchId={80} teamA={r32Matches[7].home} teamB={r32Matches[7].away} winner={localBracket.oitavas[7]} onSelect={(team) => handleSelect('r32', 7, team)} stageName="16-avos" actualWinner={actual.oitavas?.[7]} />
            <MatchCard matchId={83} teamA={r32Matches[10].home} teamB={r32Matches[10].away} winner={localBracket.oitavas[10]} onSelect={(team) => handleSelect('r32', 10, team)} stageName="16-avos" actualWinner={actual.oitavas?.[10]} />
            <MatchCard matchId={84} teamA={r32Matches[11].home} teamB={r32Matches[11].away} winner={localBracket.oitavas[11]} onSelect={(team) => handleSelect('r32', 11, team)} stageName="16-avos" actualWinner={actual.oitavas?.[11]} />
            <MatchCard matchId={81} teamA={r32Matches[8].home} teamB={r32Matches[8].away} winner={localBracket.oitavas[8]} onSelect={(team) => handleSelect('r32', 8, team)} stageName="16-avos" actualWinner={actual.oitavas?.[8]} />
            <MatchCard matchId={82} teamA={r32Matches[9].home} teamB={r32Matches[9].away} winner={localBracket.oitavas[9]} onSelect={(team) => handleSelect('r32', 9, team)} stageName="16-avos" actualWinner={actual.oitavas?.[9]} />
            <MatchCard matchId={86} teamA={r32Matches[13].home} teamB={r32Matches[13].away} winner={localBracket.oitavas[13]} onSelect={(team) => handleSelect('r32', 13, team)} stageName="16-avos" actualWinner={actual.oitavas?.[13]} />
            <MatchCard matchId={88} teamA={r32Matches[15].home} teamB={r32Matches[15].away} winner={localBracket.oitavas[15]} onSelect={(team) => handleSelect('r32', 15, team)} stageName="16-avos" actualWinner={actual.oitavas?.[15]} />
            <MatchCard matchId={85} teamA={r32Matches[12].home} teamB={r32Matches[12].away} winner={localBracket.oitavas[12]} onSelect={(team) => handleSelect('r32', 12, team)} stageName="16-avos" actualWinner={actual.oitavas?.[12]} />
            <MatchCard matchId={87} teamA={r32Matches[14].home} teamB={r32Matches[14].away} winner={localBracket.oitavas[14]} onSelect={(team) => handleSelect('r32', 14, team)} stageName="16-avos" actualWinner={actual.oitavas?.[14]} />
          </div>

          {/* COLUNA 2: Oitavas de Final (8 jogos) */}
          <div className="flex flex-col justify-between h-full py-10">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-white/5 pb-2">Oitavas (4 pts)</h3>
            <MatchCard matchId={89} teamA={localBracket.oitavas[0]} teamB={localBracket.oitavas[2]} winner={localBracket.quartas[0]} onSelect={(team) => handleSelect('oitavas', 0, team)} stageName="Oitavas" actualWinner={actual.quartas?.[0]} />
            <MatchCard matchId={90} teamA={localBracket.oitavas[1]} teamB={localBracket.oitavas[4]} winner={localBracket.quartas[1]} onSelect={(team) => handleSelect('oitavas', 1, team)} stageName="Oitavas" actualWinner={actual.quartas?.[1]} />
            <MatchCard matchId={91} teamA={localBracket.oitavas[3]} teamB={localBracket.oitavas[5]} winner={localBracket.quartas[2]} onSelect={(team) => handleSelect('oitavas', 2, team)} stageName="Oitavas" actualWinner={actual.quartas?.[2]} />
            <MatchCard matchId={92} teamA={localBracket.oitavas[6]} teamB={localBracket.oitavas[7]} winner={localBracket.quartas[3]} onSelect={(team) => handleSelect('oitavas', 3, team)} stageName="Oitavas" actualWinner={actual.quartas?.[3]} />
            <MatchCard matchId={93} teamA={localBracket.oitavas[10]} teamB={localBracket.oitavas[11]} winner={localBracket.quartas[4]} onSelect={(team) => handleSelect('oitavas', 4, team)} stageName="Oitavas" actualWinner={actual.quartas?.[4]} />
            <MatchCard matchId={94} teamA={localBracket.oitavas[8]} teamB={localBracket.oitavas[9]} winner={localBracket.quartas[5]} onSelect={(team) => handleSelect('oitavas', 5, team)} stageName="Oitavas" actualWinner={actual.quartas?.[5]} />
            <MatchCard matchId={95} teamA={localBracket.oitavas[13]} teamB={localBracket.oitavas[15]} winner={localBracket.quartas[6]} onSelect={(team) => handleSelect('oitavas', 6, team)} stageName="Oitavas" actualWinner={actual.quartas?.[6]} />
            <MatchCard matchId={96} teamA={localBracket.oitavas[12]} teamB={localBracket.oitavas[14]} winner={localBracket.quartas[7]} onSelect={(team) => handleSelect('oitavas', 7, team)} stageName="Oitavas" actualWinner={actual.quartas?.[7]} />
          </div>

          {/* COLUNA 3: Quartas de Final (4 jogos) */}
          <div className="flex flex-col justify-between h-full py-24">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-white/5 pb-2">Quartas (8 pts)</h3>
            <MatchCard matchId={97} teamA={localBracket.quartas[0]} teamB={localBracket.quartas[1]} winner={localBracket.semis[0]} onSelect={(team) => handleSelect('quartas', 0, team)} stageName="Quartas" actualWinner={actual.semis?.[0]} />
            <MatchCard matchId={98} teamA={localBracket.quartas[2]} teamB={localBracket.quartas[3]} winner={localBracket.semis[1]} onSelect={(team) => handleSelect('quartas', 1, team)} stageName="Quartas" actualWinner={actual.semis?.[1]} />
            <MatchCard matchId={99} teamA={localBracket.quartas[4]} teamB={localBracket.quartas[5]} winner={localBracket.semis[2]} onSelect={(team) => handleSelect('quartas', 2, team)} stageName="Quartas" actualWinner={actual.semis?.[2]} />
            <MatchCard matchId={100} teamA={localBracket.quartas[6]} teamB={localBracket.quartas[7]} winner={localBracket.semis[3]} onSelect={(team) => handleSelect('quartas', 3, team)} stageName="Quartas" actualWinner={actual.semis?.[3]} />
          </div>

          {/* COLUNA 4: Semifinais (2 jogos) */}
          <div className="flex flex-col justify-between h-full py-[240px]">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-white/5 pb-2">Semis (12 pts)</h3>
            <MatchCard matchId={101} teamA={localBracket.semis[0]} teamB={localBracket.semis[1]} winner={localBracket.finalists[0]} onSelect={(team) => handleSelect('semis', 0, team)} stageName="Semi" actualWinner={actual.finalists?.[0]} />
            <MatchCard matchId={102} teamA={localBracket.semis[2]} teamB={localBracket.semis[3]} winner={localBracket.finalists[1]} onSelect={(team) => handleSelect('semis', 1, team)} stageName="Semi" actualWinner={actual.finalists?.[1]} />
          </div>

          {/* COLUNA 5: Grande Final (1 jogo) */}
          <div className="flex flex-col justify-center h-full gap-24">
            <h3 className="text-[9px] font-black text-zinc-450 uppercase tracking-widest text-center border-b border-zinc-850 pb-2">Final (MetLife)</h3>
            <MatchCard matchId={104} teamA={localBracket.finalists[0]} teamB={localBracket.finalists[1]} winner={localBracket.champion} onSelect={(team) => handleSelect('final', null, team)} stageName="Final" actualWinner={actual.champion} />
          </div>

          {/* COLUNA 6: Grande Campeão (1 bloco) */}
          <div className="flex flex-col justify-center h-full">
            <div className="glass-panel p-5 rounded-3xl border border-zinc-850 relative overflow-hidden flex flex-col items-center text-center w-[185px] md:w-[205px] select-none">
              <Trophy className="text-zinc-400 mb-2" size={36} />
              <h3 className="font-extrabold text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-850 pb-1.5 w-full">
                Grande Campeão
              </h3>
              
              <div className="mt-4 flex flex-col items-center w-full">
                {localBracket.champion ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl filter drop-shadow select-none">
                      {TEAM_FLAGS[localBracket.champion] || '🏳️'}
                    </span>
                    <span className="font-black text-xs text-white truncate max-w-[160px]">
                      {localBracket.champion}
                    </span>
                    <span className="text-[8.5px] uppercase font-bold text-white bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700 mt-1">
                      🏆 Vencedor (+16 pts)
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-2">
                    <span className="text-4xl filter drop-shadow opacity-25 select-none">🏳️</span>
                    <span className="text-xs text-slate-500 italic">Escolha o campeão</span>
                  </div>
                )}
              </div>

              {hasActualResults && actual.champion && (
                <div className="mt-4 pt-3 border-t border-zinc-800 w-full text-center">
                  <p className="text-[8px] uppercase font-extrabold text-slate-400">Campeão Oficial</p>
                  <p className="font-black text-xs text-zinc-300 mt-1">
                    {TEAM_FLAGS[actual.champion] || '🏳️'} {actual.champion}
                  </p>
                  <p className="text-[9px] font-bold mt-1">
                    {localBracket.champion === actual.champion ? '👑 Acertou! (+16 pts)' : '❌ Errou'}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
