import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Check, AlertCircle, Calendar, Layers, Trophy, HelpCircle, Users, Trash2, Eye, EyeOff } from 'lucide-react';
import { updateMatch, saveGroupQualifierResults, saveBracketResults, saveOracleResults, fetchUsersList, updateUser, deleteUser } from '../services/api';
import { TEAM_FLAGS } from './DailyMatches';
import { checkIsPlaceholder } from './Knockout';

export default function Admin({ matches, groupQualifiers, bracketGuesses, oracle, onReload }) {
  const [subTab, setSubTab] = useState('matches'); // matches, groups, bracket, oracle, users

  const formatAdminDate = (dateString) => {
    if (!dateString) return '';
    let formattedString = dateString;
    const hasTimezone = dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString);
    if (!hasTimezone) {
      formattedString = dateString.includes('T') ? `${dateString}Z` : `${dateString}T00:00:00Z`;
    }
    const date = new Date(formattedString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  };
  
  // Status de carregamento e sucesso locais
  const [loadingId, setLoadingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [errorId, setErrorId] = useState(null);

  // Estados para gerenciamento de usuários (Admin)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editFields, setEditFields] = useState({}); // { [username]: { username, password } }
  const [visiblePasswords, setVisiblePasswords] = useState({}); // { [username]: boolean }

  const loadUsersList = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchUsersList();
      setUsersList(data);
      const fields = {};
      data.forEach(u => {
        fields[u.username] = { username: u.username, password: u.password };
      });
      setEditFields(fields);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (subTab === 'users') {
      loadUsersList();
    }
  }, [subTab]);

  const handleUserChange = (originalUsername, field, val) => {
    setEditFields(prev => ({
      ...prev,
      [originalUsername]: {
        ...prev[originalUsername],
        [field]: val
      }
    }));
  };

  const handleSaveUser = async (originalUsername) => {
    setLoadingId(`user-${originalUsername}`);
    setSuccessId(null);
    setErrorId(null);
    const { username: newUsername, password: newPassword } = editFields[originalUsername];

    if (!newUsername.trim() || !newPassword.trim()) {
      setErrorId(`user-${originalUsername}`);
      setLoadingId(null);
      return;
    }

    try {
      await updateUser(originalUsername, newUsername, newPassword);
      setSuccessId(`user-${originalUsername}`);
      onReload(); // Recarrega os dados do app geral
      loadUsersList(); // Recarrega a lista local de usuários
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`user-${originalUsername}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleResetUserPassword = async (username) => {
    setLoadingId(`reset-${username}`);
    setSuccessId(null);
    setErrorId(null);
    try {
      await updateUser(username, username, "123");
      setSuccessId(`reset-${username}`);
      loadUsersList();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`reset-${username}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente a conta de ${username} e todos os seus palpites?`)) {
      return;
    }
    setLoadingId(`delete-${username}`);
    try {
      await deleteUser(username);
      onReload();
      loadUsersList();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir usuário.");
    } finally {
      setLoadingId(null);
    }
  };

  const togglePasswordVisibility = (username) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  // Estados locais para inputs
  const [matchScores, setMatchScores] = useState({});
  const [groupResults, setGroupResults] = useState({});
  const [groupTeams, setGroupTeams] = useState({});
  const [allTeams, setAllTeams] = useState([]);
  const [bracketResults, setBracketResults] = useState({
    oitavas: Array(16).fill(''),
    quartas: Array(8).fill(''),
    semis: Array(4).fill(''),
    finalists: Array(2).fill(''),
    champion: ''
  });
  const [oracleResults, setOracleResults] = useState({
    champion: '',
    topScorer: '',
    bestAttack: '',
    zebra: '',
    firstRedCard: '',
    deception: '',
    mostGoalsMatch: ''
  });

  useEffect(() => {
    // 1. Partidas
    const mScores = {};
    matches.forEach(m => {
      mScores[m.id] = {
        homeScore: m.homeScore ?? '',
        awayScore: m.awayScore ?? '',
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam
      };
    });
    setMatchScores(mScores);

    // 2. Extração de times por grupo e geral
    const teamsByGroup = {};
    const tSet = new Set();
    matches.forEach(m => {
      if (m.stage === 'group') {
        if (!teamsByGroup[m.group]) {
          teamsByGroup[m.group] = new Set();
        }
        teamsByGroup[m.group].add(m.homeTeam);
        teamsByGroup[m.group].add(m.awayTeam);
      }
      if (m.homeTeam && !checkIsPlaceholder(m.homeTeam)) {
        tSet.add(m.homeTeam);
      }
      if (m.awayTeam && !checkIsPlaceholder(m.awayTeam)) {
        tSet.add(m.awayTeam);
      }
    });

    const parsedGroupTeams = {};
    Object.keys(teamsByGroup).forEach(g => {
      parsedGroupTeams[g] = Array.from(teamsByGroup[g]).sort();
    });
    setGroupTeams(parsedGroupTeams);
    setAllTeams(Array.from(tSet).sort());

    // 3. Resultados dos Grupos
    const gResults = {};
    Object.keys(parsedGroupTeams).forEach(g => {
      const act = groupQualifiers.results[g] || { first: '', second: '', third: '' };
      gResults[g] = {
        first: act.first || '',
        second: act.second || '',
        third: act.third || ''
      };
    });
    setGroupResults(gResults);

    // 4. Resultados do Mata-mata
    const bAct = bracketGuesses.results || { oitavas: [], quartas: [], semis: [], finalists: [], champion: null };
    setBracketResults({
      oitavas: bAct.oitavas || Array(16).fill(''),
      quartas: bAct.quartas || Array(8).fill(''),
      semis: bAct.semis || Array(4).fill(''),
      finalists: bAct.finalists || Array(2).fill(''),
      champion: bAct.champion || ''
    });

    // 5. Resultados do Oráculo
    const oAct = oracle.results || {};
    setOracleResults({
      champion: oAct.champion || '',
      topScorer: oAct.topScorer || '',
      bestAttack: oAct.bestAttack || '',
      zebra: oAct.zebra || '',
      firstRedCard: oAct.firstRedCard || '',
      deception: oAct.deception || '',
      mostGoalsMatch: oAct.mostGoalsMatch || ''
    });
  }, [matches, groupQualifiers, bracketGuesses, oracle]);

  // Ações de Partida
  const handleScoreChange = (matchId, team, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setMatchScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team]: value }
    }));
  };

  const handleTeamChange = (matchId, teamField, value) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [teamField]: value }
    }));
  };

  const handleSaveMatch = async (matchId) => {
    setLoadingId(matchId);
    setSuccessId(null);
    setErrorId(null);
    try {
      const { homeScore, awayScore, homeTeam, awayTeam } = matchScores[matchId];
      await updateMatch({
        id: matchId,
        homeScore: homeScore === '' ? null : parseInt(homeScore, 10),
        awayScore: awayScore === '' ? null : parseInt(awayScore, 10),
        homeTeam,
        awayTeam
      });
      setSuccessId(matchId);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(matchId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleClearMatch = async (matchId) => {
    setLoadingId(matchId);
    try {
      setMatchScores(prev => ({
        ...prev,
        [matchId]: { ...prev[matchId], homeScore: '', awayScore: '' }
      }));
      await updateMatch({
        id: matchId,
        homeScore: null,
        awayScore: null
      });
      setSuccessId(matchId);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(matchId);
    } finally {
      setLoadingId(null);
    }
  };

  // Ações de Grupos
  const handleGroupSelect = (group, spot, value) => {
    setGroupResults(prev => ({
      ...prev,
      [group]: { ...prev[group], [spot]: value }
    }));
  };

  const handleSaveGroup = async (group) => {
    setLoadingId(`group-${group}`);
    setSuccessId(null);
    setErrorId(null);
    try {
      const { first, second, third } = groupResults[group];
      await saveGroupQualifierResults(
        group,
        first === '' ? null : first,
        second === '' ? null : second,
        third === '' ? null : third
      );
      setSuccessId(`group-${group}`);
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId(`group-${group}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Ações de Chaveamento
  const handleBracketSelect = (stage, index, value) => {
    setBracketResults(prev => {
      const updated = { ...prev };
      if (stage === 'champion') {
        updated.champion = value;
      } else {
        updated[stage] = [...prev[stage]];
        updated[stage][index] = value;
      }
      return updated;
    });
  };

  const handleSaveBracket = async () => {
    setLoadingId('bracket');
    setSuccessId(null);
    setErrorId(null);
    try {
      await saveBracketResults(
        bracketResults.oitavas,
        bracketResults.quartas,
        bracketResults.semis,
        bracketResults.finalists,
        bracketResults.champion
      );
      setSuccessId('bracket');
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId('bracket');
    } finally {
      setLoadingId(null);
    }
  };

  // Ações de Oráculo
  const handleOracleChange = (key, val) => {
    setOracleResults(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSaveOracle = async () => {
    setLoadingId('oracle');
    setSuccessId(null);
    setErrorId(null);
    try {
      await saveOracleResults(oracleResults);
      setSuccessId('oracle');
      onReload();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorId('oracle');
    } finally {
      setLoadingId(null);
    }
  };

  const groups = Object.keys(groupTeams).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative bg-field-pattern">
      <div className="mb-8 border-b border-white/5 pb-4 select-none">
        <h1 className="text-3xl md:text-4xl font-extrabold text-football-gold flex items-center gap-2 animate-fadeIn">
          ⚙️ Painel do Administrador
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Espaço para inserção dos dados reais oficiais. Ao salvar qualquer item, os pontos e o ranking geral serão atualizados automaticamente!
        </p>
      </div>

      {/* Menu de Sub-abas */}
      <div className="flex gap-2 border-b border-white/5 pb-4 mb-8 overflow-x-auto no-scrollbar select-none">
        <button
          onClick={() => setSubTab('matches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'matches' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Calendar size={14} />
          <span>Partidas</span>
        </button>
        <button
          onClick={() => setSubTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'groups' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Layers size={14} />
          <span>Grupos (Fases)</span>
        </button>
        <button
          onClick={() => setSubTab('bracket')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'bracket' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Trophy size={14} />
          <span>Mata-mata (Chaves)</span>
        </button>
        <button
          onClick={() => setSubTab('oracle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'oracle' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <HelpCircle size={14} />
          <span>Oráculo (Bônus)</span>
        </button>
        <button
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 cursor-pointer ${
            subTab === 'users' ? 'bg-football-gold text-football-darkGreen font-extrabold scale-105 shadow-md shadow-amber-500/10' : 'glass-panel text-slate-300 hover:text-white border-football-glassBorder'
          }`}
        >
          <Users size={14} />
          <span>Contas</span>
        </button>
      </div>

      {/* ==========================================
          SUBTAB: MATCHES
         ========================================== */}
      {subTab === 'matches' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {matches.map((match) => {
            const score = matchScores[match.id] || { homeScore: '', awayScore: '', homeTeam: match.homeTeam, awayTeam: match.awayTeam };
            const isLoading = loadingId === match.id;
            const isSuccess = successId === match.id;
            const isError = errorId === match.id;
            const isKnockout = match.stage === 'knockout';

            return (
              <div key={match.id} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-football-gold/20 transition-all">
                <div className="flex flex-col gap-1 md:w-1/4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-football-grassGreen/30 text-football-vibrantGreen">
                      Partida #{match.id}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {match.group}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1">
                    📅 {formatAdminDate(match.date)}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-3xl mb-1 filter drop-shadow">
                      {TEAM_FLAGS[score.homeTeam] || "🏳️"}
                    </span>
                    {isKnockout ? (
                      <input
                        type="text"
                        value={score.homeTeam}
                        onChange={(e) => handleTeamChange(match.id, 'homeTeam', e.target.value)}
                        className="w-full text-center text-xs font-semibold py-1 rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-football-gold"
                      />
                    ) : (
                      <span className="font-bold text-sm text-white select-none">{match.homeTeam}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength="2"
                      value={score.homeScore}
                      onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
                      className="w-12 h-12 rounded-xl text-center text-xl font-extrabold bg-football-gold/10 border border-football-gold/30 text-football-gold focus:outline-none focus:border-football-gold focus:scale-105"
                      placeholder="-"
                    />
                    <span className="text-slate-400 font-bold select-none">x</span>
                    <input
                      type="text"
                      maxLength="2"
                      value={score.awayScore}
                      onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
                      className="w-12 h-12 rounded-xl text-center text-xl font-extrabold bg-football-gold/10 border border-football-gold/30 text-football-gold focus:outline-none focus:border-football-gold focus:scale-105"
                      placeholder="-"
                    />
                  </div>

                  <div className="flex flex-col items-center flex-1 text-center">
                    <span className="text-3xl mb-1 filter drop-shadow">
                      {TEAM_FLAGS[score.awayTeam] || "🏳️"}
                    </span>
                    {isKnockout ? (
                      <input
                        type="text"
                        value={score.awayTeam}
                        onChange={(e) => handleTeamChange(match.id, 'awayTeam', e.target.value)}
                        className="w-full text-center text-xs font-semibold py-1 rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-football-gold"
                      />
                    ) : (
                      <span className="font-bold text-sm text-white select-none">{match.awayTeam}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-end gap-2 md:w-1/5">
                  <button
                    onClick={() => handleSaveMatch(match.id)}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-1.5 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all uppercase w-full cursor-pointer ${
                      isSuccess
                        ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                        : isError
                        ? 'bg-rose-600 text-white'
                        : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                    }`}
                  >
                    {isLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : isSuccess ? (
                      <Check size={14} />
                    ) : isError ? (
                      <AlertCircle size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{isSuccess ? 'Salvo!' : 'Salvar'}</span>
                  </button>
                  {(match.homeScore !== null || match.awayScore !== null) && (
                    <button
                      onClick={() => handleClearMatch(match.id)}
                      disabled={isLoading}
                      className="text-xs py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors w-full uppercase font-bold cursor-pointer"
                    >
                      Anular
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================
          SUBTAB: GROUPS
         ========================================== */}
      {subTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {groups.map(groupName => {
            const res = groupResults[groupName] || { first: '', second: '', third: '' };
            const isLoading = loadingId === `group-${groupName}`;
            const isSuccess = successId === `group-${groupName}`;
            const isError = errorId === `group-${groupName}`;

            return (
              <div key={groupName} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-4">
                <h3 className="text-lg font-bold text-football-brightYellow border-b border-white/5 pb-2 select-none">
                  {groupName}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold select-none">🥇 1º Colocado Oficial</label>
                    <select
                      value={res.first}
                      onChange={(e) => handleGroupSelect(groupName, 'first', e.target.value)}
                      className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[groupName]?.map(t => (
                        <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold select-none">🥈 2º Colocado Oficial</label>
                    <select
                      value={res.second}
                      onChange={(e) => handleGroupSelect(groupName, 'second', e.target.value)}
                      className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[groupName]?.map(t => (
                        <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold select-none">🥉 3º Colocado Oficial</label>
                    <select
                      value={res.third || ''}
                      onChange={(e) => handleGroupSelect(groupName, 'third', e.target.value)}
                      className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                    >
                      <option value="">Selecione...</option>
                      {groupTeams[groupName]?.map(t => (
                        <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSaveGroup(groupName)}
                  disabled={isLoading}
                  className={`flex items-center justify-center gap-1.5 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all uppercase w-full cursor-pointer mt-2 ${
                    isSuccess
                      ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                      : isError
                      ? 'bg-rose-600 text-white'
                      : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : isSuccess ? (
                    <Check size={12} />
                  ) : isError ? (
                    <AlertCircle size={12} />
                  ) : (
                    <Save size={12} />
                  )}
                  <span>{isSuccess ? 'Salvo!' : 'Salvar Grupo'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ==========================================
          SUBTAB: BRACKET
         ========================================== */}
      {subTab === 'bracket' && (
        <div className="glass-panel p-6 rounded-3xl border border-football-glassBorder flex flex-col gap-6 animate-fadeIn">
          <h3 className="text-xl font-bold text-football-gold border-b border-white/5 pb-2 select-none">
            Chaveamento Oficial da Copa
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {/* Oitavas */}
            <div className="flex flex-col gap-2">
              <h4 className="font-extrabold text-[10px] text-slate-300 border-b border-white/5 pb-1.5 uppercase tracking-widest select-none">
                Oitavas (16 times)
              </h4>
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {Array(16).fill('').map((_, i) => (
                  <select
                    key={i}
                    value={bracketResults.oitavas[i] || ''}
                    onChange={(e) => handleBracketSelect('oitavas', i, e.target.value)}
                    className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                  >
                    <option value="">Time #{i+1}...</option>
                    {allTeams.map(t => (
                      <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            {/* Quartas */}
            <div className="flex flex-col gap-2">
              <h4 className="font-extrabold text-[10px] text-slate-300 border-b border-white/5 pb-1.5 uppercase tracking-widest select-none">
                Quartas de Final (8 times)
              </h4>
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {Array(8).fill('').map((_, i) => (
                  <select
                    key={i}
                    value={bracketResults.quartas[i] || ''}
                    onChange={(e) => handleBracketSelect('quartas', i, e.target.value)}
                    className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                  >
                    <option value="">Time #{i+1}...</option>
                    {allTeams.map(t => (
                      <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>

            {/* Semis */}
            <div className="flex flex-col gap-2">
              <h4 className="font-extrabold text-[10px] text-slate-300 border-b border-white/5 pb-1.5 uppercase tracking-widest select-none">
                Semifinais (4 times)
              </h4>
              {Array(4).fill('').map((_, i) => (
                <select
                  key={i}
                  value={bracketResults.semis[i] || ''}
                  onChange={(e) => handleBracketSelect('semis', i, e.target.value)}
                  className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                >
                  <option value="">Time #{i+1}...</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                  ))}
                </select>
              ))}
            </div>

            {/* Finalistas */}
            <div className="flex flex-col gap-2">
              <h4 className="font-extrabold text-[10px] text-slate-300 border-b border-white/5 pb-1.5 uppercase tracking-widest select-none">
                Finalistas (2 times)
              </h4>
              {Array(2).fill('').map((_, i) => (
                <select
                  key={i}
                  value={bracketResults.finalists[i] || ''}
                  onChange={(e) => handleBracketSelect('finalists', i, e.target.value)}
                  className="p-2.5 rounded-xl glass-input text-xs font-semibold w-full focus:border-football-gold"
                >
                  <option value="">Time #{i+1}...</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                  ))}
                </select>
              ))}
            </div>

            {/* Campeão */}
            <div className="flex flex-col gap-2">
              <h4 className="font-extrabold text-[10px] text-football-gold border-b border-football-gold/20 pb-1.5 uppercase tracking-widest select-none">
                🏆 Campeão Oficial
              </h4>
              <select
                value={bracketResults.champion || ''}
                onChange={(e) => handleBracketSelect('champion', null, e.target.value)}
                className="p-3 rounded-xl glass-input text-sm font-extrabold w-full border-football-gold/40 focus:border-football-gold"
              >
                <option value="">Campeão da Copa...</option>
                {allTeams.map(t => (
                  <option key={t} value={t}>{TEAM_FLAGS[t]} {t}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSaveBracket}
            disabled={loadingId === 'bracket'}
            className={`flex items-center justify-center gap-1.5 font-bold py-3.5 px-6 rounded-xl text-sm tracking-wider transition-all uppercase w-full cursor-pointer ${
              successId === 'bracket'
                ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                : errorId === 'bracket'
                ? 'bg-rose-600 text-white'
                : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
            }`}
          >
            {loadingId === 'bracket' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : successId === 'bracket' ? (
              <Check size={16} />
            ) : errorId === 'bracket' ? (
              <AlertCircle size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>{successId === 'bracket' ? 'Salvo com sucesso!' : 'Salvar Chaveamento Oficial'}</span>
          </button>
        </div>
      )}

      {/* ==========================================
          SUBTAB: ORACLE
         ========================================== */}
      {subTab === 'oracle' && (
        <div className="glass-panel p-6 rounded-3xl border border-football-glassBorder flex flex-col gap-6 animate-fadeIn">
          <h3 className="text-xl font-bold text-football-gold border-b border-white/5 pb-2 select-none">
            Respostas Oficiais do Oráculo
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">🏆 Campeão Oficial</label>
              <input
                type="text"
                value={oracleResults.champion}
                onChange={(e) => handleOracleChange('champion', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: Brasil"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">👟 Artilheiro da Copa</label>
              <input
                type="text"
                value={oracleResults.topScorer}
                onChange={(e) => handleOracleChange('topScorer', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: Vinicius Jr"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">💥 Melhor Ataque (Grupos)</label>
              <input
                type="text"
                value={oracleResults.bestAttack}
                onChange={(e) => handleOracleChange('bestAttack', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: França"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">🦓 Zebra da Copa</label>
              <input
                type="text"
                value={oracleResults.zebra}
                onChange={(e) => handleOracleChange('zebra', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: Marrocos"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">🟥 Primeiro Cartão Vermelho</label>
              <input
                type="text"
                value={oracleResults.firstRedCard}
                onChange={(e) => handleOracleChange('firstRedCard', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: Casemiro"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">📉 Maior Decepção</label>
              <input
                type="text"
                value={oracleResults.deception}
                onChange={(e) => handleOracleChange('deception', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: Alemanha"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 select-none">⚽ Jogo com mais Gols</label>
              <input
                type="text"
                value={oracleResults.mostGoalsMatch}
                onChange={(e) => handleOracleChange('mostGoalsMatch', e.target.value)}
                className="p-3 rounded-xl glass-input text-xs font-semibold focus:border-football-gold"
                placeholder="Ex: Brasil x Croácia"
              />
            </div>
          </div>

          <button
            onClick={handleSaveOracle}
            disabled={loadingId === 'oracle'}
            className={`flex items-center justify-center gap-1.5 font-bold py-3.5 px-6 rounded-xl text-sm tracking-wider transition-all uppercase w-full cursor-pointer mt-4 ${
              successId === 'oracle'
                ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                : errorId === 'oracle'
                ? 'bg-rose-600 text-white'
                : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
            }`}
          >
            {loadingId === 'oracle' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : successId === 'oracle' ? (
              <Check size={16} />
            ) : errorId === 'oracle' ? (
              <AlertCircle size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>{successId === 'oracle' ? 'Respostas salvas!' : 'Salvar Respostas do Oráculo'}</span>
          </button>
        </div>
      )}

      {/* ==========================================
          SUBTAB: USERS (CONTAS)
         ========================================== */}
      {subTab === 'users' && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          {loadingUsers ? (
            <div className="text-center py-8 text-slate-400">Carregando contas...</div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Nenhum usuário encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {usersList.map((user) => {
                const originalUsername = user.username;
                const fields = editFields[originalUsername] || { username: originalUsername, password: user.password };
                const isLoading = loadingId === `user-${originalUsername}`;
                const isResetLoading = loadingId === `reset-${originalUsername}`;
                const isDeleteLoading = loadingId === `delete-${originalUsername}`;
                const isSuccess = successId === `user-${originalUsername}` || successId === `reset-${originalUsername}`;
                const isError = errorId === `user-${originalUsername}`;
                const isPassVisible = !!visiblePasswords[originalUsername];

                return (
                  <div key={originalUsername} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col gap-4 hover:border-football-gold/20 transition-all">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="font-extrabold text-white text-base flex items-center gap-1.5">
                        👤 {originalUsername}
                      </span>
                      {user.id !== 1 && originalUsername !== 'André' && originalUsername !== 'andre' && (
                        <button
                          onClick={() => handleDeleteUser(originalUsername)}
                          disabled={isDeleteLoading || isLoading}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir Conta"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold select-none">Nome de Usuário</label>
                        <input
                          type="text"
                          value={fields.username}
                          onChange={(e) => handleUserChange(originalUsername, 'username', e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl glass-input text-sm focus:border-football-gold transition-all"
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold select-none">Senha</label>
                        <div className="relative mt-1">
                          <input
                            type={isPassVisible ? "text" : "password"}
                            value={fields.password}
                            onChange={(e) => handleUserChange(originalUsername, 'password', e.target.value)}
                            className="w-full pl-3 pr-10 py-2 rounded-xl glass-input text-sm focus:border-football-gold transition-all"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(originalUsername)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveUser(originalUsername)}
                        disabled={isLoading || isResetLoading || isDeleteLoading}
                        className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2 rounded-xl text-xs uppercase transition-all cursor-pointer ${
                          isSuccess && successId === `user-${originalUsername}`
                            ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                            : isError
                            ? 'bg-rose-600 text-white'
                            : 'bg-football-gold text-football-darkGreen hover:bg-amber-400 active:scale-95 shadow shadow-amber-500/10'
                        }`}
                      >
                        {isLoading ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        <span>{isSuccess && successId === `user-${originalUsername}` ? 'Salvo!' : 'Salvar'}</span>
                      </button>

                      <button
                        onClick={() => handleResetUserPassword(originalUsername)}
                        disabled={isLoading || isResetLoading || isDeleteLoading}
                        className={`flex-1 text-xs py-2 rounded-xl border border-football-gold/30 text-football-gold hover:bg-football-gold/10 hover:text-football-brightYellow transition-colors uppercase font-bold cursor-pointer ${
                          isSuccess && successId === `reset-${originalUsername}` ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''
                        }`}
                      >
                        {isResetLoading ? "Resetando..." : isSuccess && successId === `reset-${originalUsername}` ? "Resetado!" : "Resetar p/ 123"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
