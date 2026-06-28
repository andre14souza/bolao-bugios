import { calculateMatchScore } from './points';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseEnabled = supabaseUrl !== '' && supabaseAnonKey !== '';
const supabase = isSupabaseEnabled ? createClient(supabaseUrl, supabaseAnonKey) : null;

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ==========================================
// SERVIÇOS DE PARTIDAS E PALPITES DE GOLS
// ==========================================

export async function fetchMatches() {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('matches').select('*').order('date', { ascending: true });
    if (error) throw error;
    return data.map(m => ({
      id: String(m.id),
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: m.home_score,
      awayScore: m.away_score,
      date: m.date,
      stage: m.stage,
      group: m.group_name,
      locked: m.locked || false
    }));
  } else {
    const res = await fetch(`${API_BASE}/api/matches`);
    return await res.json();
  }
}

export async function updateMatch(matchData) {
  const hScore = matchData.homeScore === null || matchData.homeScore === "" || matchData.homeScore === undefined ? null : parseInt(matchData.homeScore, 10);
  const aScore = matchData.awayScore === null || matchData.awayScore === "" || matchData.awayScore === undefined ? null : parseInt(matchData.awayScore, 10);

  if (isSupabaseEnabled) {
    const dbData = { home_score: hScore, away_score: aScore };
    if (matchData.homeTeam) dbData.home_team = matchData.homeTeam;
    if (matchData.awayTeam) dbData.away_team = matchData.awayTeam;
    if (matchData.date) dbData.date = matchData.date;
    if (matchData.stage) dbData.stage = matchData.stage;
    if (matchData.group) dbData.group_name = matchData.group;

    const { data, error } = await supabase.from('matches').update(dbData).eq('id', parseInt(matchData.id, 10)).select();
    if (error) throw error;
    return data;
  } else {
    const res = await fetch(`${API_BASE}/api/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...matchData, homeScore: hScore, awayScore: aScore })
    });
    return await res.json();
  }
}

export async function toggleMatchLock(matchId, locked) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase
      .from('matches')
      .update({ locked })
      .eq('id', parseInt(matchId, 10))
      .select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/matches/${matchId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao bloquear partida');
    }
    return await res.json();
  }
}

export async function fetchGuesses() {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('guesses').select('*');
    if (error) throw error;
    return data.map(g => ({
      user: g.user_name,
      matchId: String(g.match_id),
      homeScore: g.guess_home,
      awayScore: g.guess_away
    }));
  } else {
    const res = await fetch(`${API_BASE}/api/guesses`);
    return await res.json();
  }
}

export async function saveGuess(user, matchId, homeScore, awayScore) {
  const hScore = homeScore === "" || homeScore === null || homeScore === undefined ? null : parseInt(homeScore, 10);
  const aScore = awayScore === "" || awayScore === null || awayScore === undefined ? null : parseInt(awayScore, 10);

  if (isSupabaseEnabled) {
    if (hScore === null || aScore === null) {
      const { error } = await supabase.from('guesses').delete().eq('user_name', user).eq('match_id', parseInt(matchId, 10));
      if (error) throw error;
      return { success: true };
    } else {
      const { data, error } = await supabase.from('guesses').upsert({
        user_name: user,
        match_id: parseInt(matchId, 10),
        guess_home: hScore,
        guess_away: aScore,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_name,match_id' }).select();
      if (error) throw error;
      return { success: true, data };
    }
  } else {
    const res = await fetch(`${API_BASE}/api/guesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, matchId, homeScore: hScore, awayScore: aScore })
    });
    return await res.json();
  }
}

// ==========================================
// SERVIÇOS DE CLASSIFICAÇÃO DE GRUPOS
// ==========================================

export async function fetchGroupQualifiers() {
  if (isSupabaseEnabled) {
    const [guessesRes, resultsRes] = await Promise.all([
      supabase.from('group_qualifiers').select('*'),
      supabase.from('group_qualifiers_results').select('*')
    ]);
    if (guessesRes.error) throw guessesRes.error;
    if (resultsRes.error) throw resultsRes.error;

    const resultsMap = {};
    resultsRes.data.forEach(r => {
      resultsMap[r.group_name] = { first: r.first_place, second: r.second_place, third: r.third_place };
    });

    return {
      guesses: guessesRes.data.map(g => ({
        user: g.user_name,
        group: g.group_name,
        first: g.first_place,
        second: g.second_place,
        third: g.third_place
      })),
      results: resultsMap
    };
  } else {
    const res = await fetch(`${API_BASE}/api/group-qualifiers`);
    return await res.json();
  }
}

export async function saveGroupQualifier(user, group, first, second, third) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('group_qualifiers').upsert({
      user_name: user,
      group_name: group,
      first_place: first,
      second_place: second,
      third_place: third,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_name,group_name' }).select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/group-qualifiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, group, first, second, third })
    });
    return await res.json();
  }
}

export async function saveGroupQualifierResults(group, first, second, third) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('group_qualifiers_results').upsert({
      group_name: group,
      first_place: first,
      second_place: second,
      third_place: third,
      updated_at: new Date().toISOString()
    }, { onConflict: 'group_name' }).select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/group-qualifiers/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group, first, second, third })
    });
    return await res.json();
  }
}

// ==========================================
// SERVIÇOS DE CHAVEAMENTO (MATA-MATA)
// ==========================================

export async function fetchBracket() {
  if (isSupabaseEnabled) {
    const [guessesRes, resultsRes] = await Promise.all([
      supabase.from('bracket_guesses').select('*'),
      supabase.from('bracket_results').select('*').maybeSingle()
    ]);
    if (guessesRes.error) throw guessesRes.error;
    
    // Suporta o caso em que o registro de resultados do chaveamento não existe
    let bracketResult = { oitavas: [], quartas: [], semis: [], finalists: [], champion: null };
    if (!resultsRes.error && resultsRes.data) {
      bracketResult = {
        oitavas: resultsRes.data.oitavas || [],
        quartas: resultsRes.data.quartas || [],
        semis: resultsRes.data.semis || [],
        finalists: resultsRes.data.finalists || [],
        champion: resultsRes.data.champion
      };
    }

    return {
      guesses: guessesRes.data.map(b => ({
        user: b.user_name,
        oitavas: b.oitavas || [],
        quartas: b.quartas || [],
        semis: b.semis || [],
        finalists: b.finalists || [],
        champion: b.champion
      })),
      results: bracketResult
    };
  } else {
    const res = await fetch(`${API_BASE}/api/bracket`);
    return await res.json();
  }
}

export async function saveBracket(user, oitavas, quartas, semis, finalists, champion) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('bracket_guesses').upsert({
      user_name: user,
      oitavas,
      quartas,
      semis,
      finalists,
      champion,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_name' }).select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/bracket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, oitavas, quartas, semis, finalists, champion })
    });
    return await res.json();
  }
}

export async function saveBracketResults(oitavas, quartas, semis, finalists, champion) {
  if (isSupabaseEnabled) {
    // Seta ID fixo = 1 para termos apenas uma linha de resultado oficial
    const { data, error } = await supabase.from('bracket_results').upsert({
      id: 1,
      oitavas,
      quartas,
      semis,
      finalists,
      champion,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' }).select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/bracket/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oitavas, quartas, semis, finalists, champion })
    });
    return await res.json();
  }
}

export function parseOracleResult(rawResult) {
  if (!rawResult) return { text: '', correct: [], isManual: false };
  
  if (typeof rawResult === 'string') {
    const trimmed = rawResult.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawResult);
        return {
          text: parsed.text || '',
          correct: parsed.correct || [],
          isManual: true
        };
      } catch (e) {
        return { text: rawResult, correct: [], isManual: false };
      }
    }
    return { text: rawResult, correct: [], isManual: false };
  } else if (typeof rawResult === 'object' && rawResult !== null) {
    return {
      text: rawResult.text || '',
      correct: rawResult.correct || [],
      isManual: true
    };
  }
  return { text: String(rawResult), correct: [], isManual: false };
}

export async function fetchOracle() {
  if (isSupabaseEnabled) {
    const [guessesRes, resultsRes] = await Promise.all([
      supabase.from('oracle_guesses').select('*'),
      supabase.from('oracle_results').select('*').maybeSingle()
    ]);
    if (guessesRes.error) throw guessesRes.error;

    let resultsData = {};
    if (!resultsRes.error && resultsRes.data) {
      resultsData = {
        champion: resultsRes.data.champion,
        topScorer: resultsRes.data.top_scorer,
        bestAttack: resultsRes.data.best_attack,
        zebra: resultsRes.data.zebra,
        firstRedCard: resultsRes.data.first_red_card,
        deception: resultsRes.data.deception,
        mostGoalsMatch: resultsRes.data.most_goals_match
      };
    }

    return {
      guesses: guessesRes.data.map(o => ({
        user: o.user_name,
        champion: o.champion,
        topScorer: o.top_scorer,
        bestAttack: o.best_attack,
        zebra: o.zebra,
        firstRedCard: o.first_red_card,
        deception: o.deception,
        mostGoalsMatch: o.most_goals_match
      })),
      results: resultsData
    };
  } else {
    const res = await fetch(`${API_BASE}/api/oracle`);
    return await res.json();
  }
}

export async function saveOracle(oracleData) {
  if (isSupabaseEnabled) {
    const { user, champion, topScorer, bestAttack, zebra, firstRedCard, deception, mostGoalsMatch } = oracleData;
    const { data, error } = await supabase.from('oracle_guesses').upsert({
      user_name: user,
      champion,
      top_scorer: topScorer,
      best_attack: bestAttack,
      zebra,
      first_red_card: firstRedCard,
      deception,
      most_goals_match: mostGoalsMatch,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_name' }).select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/oracle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oracleData)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Erro ao salvar Oráculo");
    }
    return await res.json();
  }
}

export async function saveOracleResults(oracleResultsData) {
  if (isSupabaseEnabled) {
    const { champion, topScorer, bestAttack, zebra, firstRedCard, deception, mostGoalsMatch } = oracleResultsData;
    const { data, error } = await supabase.from('oracle_results').upsert({
      id: 1,
      champion: typeof champion === 'object' ? JSON.stringify(champion) : champion,
      top_scorer: typeof topScorer === 'object' ? JSON.stringify(topScorer) : topScorer,
      best_attack: typeof bestAttack === 'object' ? JSON.stringify(bestAttack) : bestAttack,
      zebra: typeof zebra === 'object' ? JSON.stringify(zebra) : zebra,
      first_red_card: typeof firstRedCard === 'object' ? JSON.stringify(firstRedCard) : firstRedCard,
      deception: typeof deception === 'object' ? JSON.stringify(deception) : deception,
      most_goals_match: typeof mostGoalsMatch === 'object' ? JSON.stringify(mostGoalsMatch) : mostGoalsMatch,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' }).select();
    if (error) throw error;
    return { success: true, data };
  } else {
    const res = await fetch(`${API_BASE}/api/oracle/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oracleResultsData)
    });
    return await res.json();
  }
}

// ==========================================
// SERVIÇOS DE USUÁRIOS E AUTENTICAÇÃO
// ==========================================

export async function fetchUsers() {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('users').select('username');
    if (error) throw error;
    return data.map(u => u.username);
  } else {
    const res = await fetch(`${API_BASE}/api/users`);
    return await res.json();
  }
}

export async function loginUser(username, password) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .maybeSingle();
    
    if (error) throw error;
    if (!data || data.password !== password) {
      throw new Error("Usuário ou senha incorretos.");
    }
    return { username: data.username, id: data.id };
  } else {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Erro ao fazer login.");
    }
    return { username: result.username, id: result.id };
  }
}

export async function registerUser(username, password) {
  const trimmed = username.trim();
  if (isSupabaseEnabled) {
    // Verificar se usuário já existe
    const { data: existing, error: existError } = await supabase
      .from('users')
      .select('username')
      .eq('username', trimmed)
      .maybeSingle();
    
    if (existError) throw existError;
    if (existing) {
      throw new Error("Este usuário já existe.");
    }
    
    const { error } = await supabase
      .from('users')
      .insert({ username: trimmed, password });
      
    if (error) throw error;
    return trimmed;
  } else {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed, password })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Erro ao registrar usuário.");
    }
    return trimmed;
  }
}

export async function resetPassword(username, newPassword) {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('username', username.trim());
    if (error) throw error;
    return { success: true, username };
  } else {
    const res = await fetch(`${API_BASE}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Erro ao resetar senha.");
    }
    return result;
  }
}

export async function updateUser(oldUsername, newUsername, newPassword) {
  const oldTrimmed = oldUsername.trim();
  const newTrimmed = newUsername ? newUsername.trim() : null;

  if (isSupabaseEnabled) {
    // Se o nome está mudando, verifica se o novo nome já existe
    if (newTrimmed && newTrimmed.toLowerCase() !== oldTrimmed.toLowerCase()) {
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', newTrimmed)
        .maybeSingle();
      if (existing) {
        throw new Error("Este nome de usuário já está em uso.");
      }
    }

    const updateData = {};
    if (newPassword) updateData.password = newPassword;
    if (newTrimmed) updateData.username = newTrimmed;

    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('username', oldTrimmed);
    if (userError) throw userError;

    // Se o nome mudou, faz o cascade para todas as outras tabelas
    if (newTrimmed && newTrimmed !== oldTrimmed) {
      await Promise.all([
        supabase.from('guesses').update({ user_name: newTrimmed }).eq('user_name', oldTrimmed),
        supabase.from('group_qualifiers').update({ user_name: newTrimmed }).eq('user_name', oldTrimmed),
        supabase.from('bracket_guesses').update({ user_name: newTrimmed }).eq('user_name', oldTrimmed),
        supabase.from('oracle_guesses').update({ user_name: newTrimmed }).eq('user_name', oldTrimmed)
      ]);
    }

    return { success: true, username: newTrimmed || oldTrimmed };
  } else {
    const res = await fetch(`${API_BASE}/api/users/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldUsername, newUsername, newPassword })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Erro ao atualizar conta.");
    }
    return result;
  }
}

export async function fetchUsersList() {
  if (isSupabaseEnabled) {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data.map(u => ({ id: u.id, username: u.username, password: u.password }));
  } else {
    const res = await fetch(`${API_BASE}/api/admin/users`);
    if (!res.ok) {
      throw new Error("Erro ao carregar lista de usuários.");
    }
    return await res.json();
  }
}

export async function deleteUser(username) {
  const trimmed = username.trim();
  if (isSupabaseEnabled) {
    // Exclui cascateando
    await Promise.all([
      supabase.from('guesses').delete().eq('user_name', trimmed),
      supabase.from('group_qualifiers').delete().eq('user_name', trimmed),
      supabase.from('bracket_guesses').delete().eq('user_name', trimmed),
      supabase.from('oracle_guesses').delete().eq('user_name', trimmed)
    ]);
    const { error } = await supabase.from('users').delete().eq('username', trimmed);
    if (error) throw error;
    return { success: true };
  } else {
    const res = await fetch(`${API_BASE}/api/users/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Erro ao excluir usuário.");
    }
    return result;
  }
}

export async function fetchSettings() {
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (error) {
        console.warn("Erro ao buscar configurações no Supabase (tabela settings pode não existir):", error);
        return { knockoutEnabled: false };
      }
      return data ? { knockoutEnabled: data.knockout_enabled } : { knockoutEnabled: false };
    } catch (err) {
      console.warn("Falha de conexão com a tabela settings no Supabase:", err);
      return { knockoutEnabled: false };
    }
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (!res.ok) return { knockoutEnabled: false };
      return await res.json();
    } catch (err) {
      console.error("Falha ao se conectar à API settings local:", err);
      return { knockoutEnabled: false };
    }
  }
}

export async function saveSettings(knockoutEnabled) {
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase.from('settings').upsert({
        id: 1,
        knockout_enabled: knockoutEnabled,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).select();
      if (error) throw error;
      return { success: true, settings: { knockoutEnabled: data[0].knockout_enabled } };
    } catch (err) {
      console.error("Erro ao salvar configurações no Supabase:", err);
      return { success: false, error: err.message, settings: { knockoutEnabled } };
    }
  } else {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knockoutEnabled })
    });
    return await res.json();
  }
}

export async function fetchPointsAdjustments() {
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase.from('points_adjustments').select('*');
      if (error) {
        console.warn("Erro ao buscar ajustes de pontos no Supabase:", error);
        return [];
      }
      return data ? data.map(a => ({
        user: a.user_name,
        points: a.points,
        description: a.description
      })) : [];
    } catch (err) {
      console.warn("Falha de conexão com a tabela points_adjustments no Supabase:", err);
      return [];
    }
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/points-adjustments`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error("Falha ao se conectar à API points-adjustments local:", err);
      return [];
    }
  }
}

export async function savePointsAdjustment(user, points, description) {
  const pts = parseInt(points, 10) || 0;
  if (isSupabaseEnabled) {
    if (pts === 0) {
      const { error } = await supabase.from('points_adjustments').delete().eq('user_name', user);
      if (error) throw error;
      return { success: true };
    } else {
      const { data, error } = await supabase.from('points_adjustments').upsert({
        user_name: user,
        points: pts,
        description,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_name' }).select();
      if (error) throw error;
      return { success: true, data };
    }
  } else {
    const res = await fetch(`${API_BASE}/api/points-adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, points: pts, description })
    });
    return await res.json();
  }
}

// ==========================================
// CÁLCULO GERAL DE RANKING DINÂMICO
// ==========================================

export function computeRanking(users, matches, guesses, groupQualifiersData = {}, bracketData = {}, oracleData = {}, pointsAdjustments = []) {
  // Inicializa a pontuação dos 7 amigos
  const ranking = users.map(u => ({
    user: u,
    points: 0,
    matchPoints: 0,
    groupPoints: 0,
    bracketPoints: 0,
    oraclePoints: 0,
    exactMatches: 0, // Mosca
    winnerMatches: 0, // Vencedor/Saldo/Empate
    totalGuesses: 0,
    penaltyPoints: 0,
    penaltyReason: '',
    bonusPoints: 0,
    bonusReason: ''
  }));

  // 1. Pontos das partidas individuais (placar por aproximação)
  guesses.forEach(g => {
    const match = matches.find(m => String(m.id) === String(g.matchId));
    if (match && match.homeScore !== null && match.awayScore !== null) {
      const userRank = ranking.find(r => r.user === g.user);
      if (userRank) {
        const score = calculateMatchScore(g.homeScore, g.awayScore, match.homeScore, match.awayScore);
        userRank.matchPoints += score.points;
        userRank.points += score.points;
        userRank.totalGuesses += 1;
        if (score.isExact) {
          userRank.exactMatches += 1;
        } else if (score.isWinner) {
          userRank.winnerMatches += 1;
        }
      }
    }
  });

  // 2. Pontos de classificação de grupo (1º, 2º e 3º)
  const gGuesses = groupQualifiersData.guesses || [];
  const gResults = groupQualifiersData.results || {};

  gGuesses.forEach(g => {
    const actual = gResults[g.group];
    // Se o admin inseriu resultado oficial para o grupo
    if (actual && (actual.first !== null || actual.second !== null || actual.third !== null)) {
      const userRank = ranking.find(r => r.user === g.user);
      if (userRank) {
        let pts = 0;
        // Valida o palpite de 1º lugar
        if (g.first) {
          if (g.first === actual.first) {
            pts += 5; // Posição exata
          } else if (g.first === actual.second || g.first === actual.third) {
            pts += 3; // Passou em 2º ou 3º
          }
        }
        // Valida o palpite de 2º lugar
        if (g.second) {
          if (g.second === actual.second) {
            pts += 5; // Posição exata
          } else if (g.second === actual.first || g.second === actual.third) {
            pts += 3; // Passou em 1º ou 3º
          }
        }
        // Valida o palpite de 3º lugar
        if (g.third) {
          if (g.third === actual.third) {
            pts += 5; // Posição exata
          } else if (g.third === actual.first || g.third === actual.second) {
            pts += 3; // Passou em 1º ou 2º
          }
        }
        userRank.groupPoints += pts;
        userRank.points += pts;
      }
    }
  });

  // 3. Pontos de Mata-mata (Chaveamento)
  const bGuesses = bracketData.guesses || [];
  const bResults = bracketData.results || { oitavas: [], quartas: [], semis: [], finalists: [], champion: null };

  bGuesses.forEach(b => {
    const userRank = ranking.find(r => r.user === b.user);
    if (userRank) {
      let pts = 0;
      
      // Oitavas (2 pts por time correto)
      if (b.oitavas && bResults.oitavas && bResults.oitavas.length > 0) {
        b.oitavas.forEach(team => {
          if (team && bResults.oitavas.includes(team)) pts += 2;
        });
      }

      // Quartas (4 pts por time correto)
      if (b.quartas && bResults.quartas && bResults.quartas.length > 0) {
        b.quartas.forEach(team => {
          if (team && bResults.quartas.includes(team)) pts += 4;
        });
      }

      // Semis (8 pts por time correto)
      if (b.semis && bResults.semis && bResults.semis.length > 0) {
        b.semis.forEach(team => {
          if (team && bResults.semis.includes(team)) pts += 8;
        });
      }

      // Finalistas (12 pts por time correto)
      if (b.finalists && bResults.finalists && bResults.finalists.length > 0) {
        b.finalists.forEach(team => {
          if (team && bResults.finalists.includes(team)) pts += 12;
        });
      }

      // Campeão (16 pts)
      if (b.champion && bResults.champion && b.champion === bResults.champion) {
        pts += 16;
      }

      userRank.bracketPoints += pts;
      userRank.points += pts;
    }
  });

  // 4. Pontos do Oráculo (Perguntas Bônus)
  const oGuesses = oracleData.guesses || [];
  const oResults = oracleData.results || {};

  oGuesses.forEach(o => {
    const userRank = ranking.find(r => r.user === o.user);
    if (userRank) {
      let pts = 0;
      const keys = ['champion', 'topScorer', 'bestAttack', 'zebra', 'firstRedCard', 'deception', 'mostGoalsMatch'];
      
      keys.forEach(k => {
        const rawRes = oResults[k];
        if (!rawRes) return;

        const { text: realAns, correct: correctUsers, isManual } = parseOracleResult(rawRes);
        
        if (isManual) {
          const hasPoints = correctUsers.some(u => u.toLowerCase() === o.user.toLowerCase());
          if (hasPoints) {
            pts += 5;
          }
        } else {
          const userAns = o[k] ? String(o[k]).trim().toLowerCase() : '';
          const cleanRealAns = realAns.trim().toLowerCase();
          if (userAns && cleanRealAns && userAns === cleanRealAns) {
            pts += 5;
          }
        }
      });
      
      userRank.oraclePoints += pts;
      userRank.points += pts;
    }
  });

  // Aplica as penalidades / bônus dinâmicos se houverem
  if (Array.isArray(pointsAdjustments)) {
    pointsAdjustments.forEach(adj => {
      const userRank = ranking.find(r => r.user.toLowerCase() === adj.user.toLowerCase());
      if (userRank) {
        if (adj.points < 0) {
          userRank.penaltyPoints = Math.abs(adj.points);
          userRank.penaltyReason = adj.description || '';
          userRank.points += adj.points;
        } else if (adj.points > 0) {
          userRank.bonusPoints = adj.points;
          userRank.bonusReason = adj.description || '';
          userRank.points += adj.points;
        }
      }
    });
  }

  // Ordena a classificação: Pontos Totais (desc), Placares Exatos (desc), Acertos Vencedores (desc), Nome Alfabético (asc)
  ranking.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactMatches !== a.exactMatches) return b.exactMatches - a.exactMatches;
    if (b.winnerMatches !== a.winnerMatches) return b.winnerMatches - a.winnerMatches;
    return a.user.localeCompare(b.user);
  });

  return ranking;
}
