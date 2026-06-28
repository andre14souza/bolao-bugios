import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH || path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json());

// Helper para ler/escrever o banco local JSON
const readDB = () => {
  try {
    if (!fs.existsSync(dbPath)) {
      return {
        matches: [],
        guesses: [],
        groupQualifiers: [],
        groupQualifiersResults: {},
        bracketGuesses: [],
        bracketResults: { oitavas: [], quartas: [], semis: [], finalists: [], champion: null },
        oracle: [],
        oracleResults: {},
        settings: { knockoutEnabled: false }
      };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.settings) {
      parsed.settings = { knockoutEnabled: false };
    }
    return parsed;
  } catch (err) {
    console.error("Erro ao ler banco de dados local:", err);
    return {
      matches: [],
      guesses: [],
      groupQualifiers: [],
      groupQualifiersResults: {},
      bracketGuesses: [],
      bracketResults: { oitavas: [], quartas: [], semis: [], finalists: [], champion: null },
      oracle: [],
      oracleResults: {},
      settings: { knockoutEnabled: false }
    };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Erro ao escrever no banco de dados local:", err);
  }
};

// Inicializar usuários padrão e remover excluídos (Charles, Eduardo, Paulo)
const initDB = () => {
  const db = readDB();
  let modified = false;

  if (!db.users || db.users.length === 0) {
    db.users = [
      { id: 1, username: "andre", password: "123" },
      { id: 2, username: "Maicon", password: "123" },
      { id: 3, username: "Brenno", password: "123" },
      { id: 4, username: "Victor", password: "123" }
    ];
    modified = true;
  } else {
    // Garantir exclusão dos perfis charles, eduardo e paulo na lista de usuários
    const originalCount = db.users.length;
    db.users = db.users.filter(u => !['charles', 'eduardo', 'paulo'].includes(u.username.toLowerCase()));
    if (db.users.length !== originalCount) {
      modified = true;
    }
  }

  // Renomear "André" para "andre" em cascata se existir no DB
  db.users.forEach(u => {
    if (u.username === "André") {
      u.username = "andre";
      modified = true;
    }
  });

  if (db.guesses) {
    db.guesses.forEach(g => {
      if (g.user === "André") {
        g.user = "andre";
        modified = true;
      }
    });
  }

  if (db.groupQualifiers) {
    db.groupQualifiers.forEach(g => {
      if (g.user === "André") {
        g.user = "andre";
        modified = true;
      }
    });
  }

  if (db.bracketGuesses) {
    db.bracketGuesses.forEach(b => {
      if (b.user === "André") {
        b.user = "andre";
        modified = true;
      }
    });
  }

  if (db.oracle) {
    db.oracle.forEach(o => {
      if (o.user === "André") {
        o.user = "andre";
        modified = true;
      }
    });
  }

  // Garantir que todos os usuários tenham um ID
  let maxId = 0;
  db.users.forEach(u => {
    if (u.id && u.id > maxId) {
      maxId = u.id;
    }
  });
  db.users.forEach(u => {
    if (!u.id) {
      maxId += 1;
      u.id = maxId;
      modified = true;
    }
  });

  // Limpar outros dados associados a estes usuários se existirem
  const excluded = ['charles', 'eduardo', 'paulo'];
  if (db.guesses) {
    const orig = db.guesses.length;
    db.guesses = db.guesses.filter(g => !excluded.includes(g.user.toLowerCase()));
    if (db.guesses.length !== orig) modified = true;
  }
  if (db.groupQualifiers) {
    const orig = db.groupQualifiers.length;
    db.groupQualifiers = db.groupQualifiers.filter(g => !excluded.includes(g.user.toLowerCase()));
    if (db.groupQualifiers.length !== orig) modified = true;
  }
  if (db.bracketGuesses) {
    const orig = db.bracketGuesses.length;
    db.bracketGuesses = db.bracketGuesses.filter(b => !excluded.includes(b.user.toLowerCase()));
    if (db.bracketGuesses.length !== orig) modified = true;
  }
  if (db.oracle) {
    const orig = db.oracle.length;
    db.oracle = db.oracle.filter(o => !excluded.includes(o.user.toLowerCase()));
    if (db.oracle.length !== orig) modified = true;
  }

  if (modified) {
    writeDB(db);
  }
};
initDB();

// Rotas de Autenticação e Usuários
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
  }
  const db = readDB();
  if (!db.users) db.users = [];

  const trimmedUser = username.trim();
  const exists = db.users.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Este usuário já existe." });
  }

  const nextId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id || 0)) + 1 : 1;
  db.users.push({ id: nextId, username: trimmedUser, password });
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
  }
  const db = readDB();
  if (!db.users) db.users = [];

  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Usuário ou senha incorretos." });
  }
  res.json({ success: true, username: user.username, id: user.id });
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  if (!db.users) db.users = [];
  res.json(db.users.map(u => u.username));
});

// Rota para resetar senha diretamente (Esqueci Senha)
app.post('/api/users/reset-password', (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: "Nome de usuário e nova senha são obrigatórios." });
  }
  const db = readDB();
  if (!db.users) db.users = [];

  const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  user.password = newPassword;
  writeDB(db);
  res.json({ success: true, username: user.username });
});

// Rota para atualizar a conta do próprio usuário (alterar nome e/ou senha)
app.post('/api/users/update', (req, res) => {
  const { oldUsername, newUsername, newPassword } = req.body;
  if (!oldUsername) {
    return res.status(400).json({ error: "Nome de usuário atual é obrigatório." });
  }
  const db = readDB();
  if (!db.users) db.users = [];

  const user = db.users.find(u => u.username.toLowerCase() === oldUsername.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const trimmedNewUser = newUsername ? newUsername.trim() : null;

  // Se o nome está mudando, verifica se o novo nome já existe
  if (trimmedNewUser && trimmedNewUser.toLowerCase() !== oldUsername.trim().toLowerCase()) {
    const exists = db.users.some(u => u.username.toLowerCase() === trimmedNewUser.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Este nome de usuário já está em uso." });
    }
  }

  // Atualiza senha se enviada
  if (newPassword) {
    user.password = newPassword;
  }

  // Se o nome de usuário mudou, faz o cascade em todas as tabelas
  if (trimmedNewUser && trimmedNewUser !== user.username) {
    const oldName = user.username;
    user.username = trimmedNewUser;

    // Cascade em guesses
    if (db.guesses) {
      db.guesses.forEach(g => {
        if (g.user === oldName) g.user = trimmedNewUser;
      });
    }

    // Cascade em groupQualifiers
    if (db.groupQualifiers) {
      db.groupQualifiers.forEach(g => {
        if (g.user === oldName) g.user = trimmedNewUser;
      });
    }

    // Cascade em bracketGuesses
    if (db.bracketGuesses) {
      db.bracketGuesses.forEach(b => {
        if (b.user === oldName) b.user = trimmedNewUser;
      });
    }

    // Cascade em oracle
    if (db.oracle) {
      db.oracle.forEach(o => {
        if (o.user === oldName) o.user = trimmedNewUser;
      });
    }
  }

  writeDB(db);
  res.json({ success: true, username: user.username, id: user.id });
});

// Rota para o Admin listar todas as contas com suas senhas
app.get('/api/admin/users', (req, res) => {
  const db = readDB();
  if (!db.users) db.users = [];
  res.json(db.users.map(u => ({
    id: u.id,
    username: u.username,
    password: u.password
  })));
});

// Rota para deletar uma conta (Admin)
app.post('/api/users/delete', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Nome de usuário é obrigatório." });
  }
  const db = readDB();
  if (!db.users) db.users = [];

  const idx = db.users.findIndex(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (idx === -1) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const oldName = db.users[idx].username;
  db.users.splice(idx, 1);

  // Deleta cascateando guesses, qualifiers, bracketGuesses, oracle
  if (db.guesses) db.guesses = db.guesses.filter(g => g.user !== oldName);
  if (db.groupQualifiers) db.groupQualifiers = db.groupQualifiers.filter(g => g.user !== oldName);
  if (db.bracketGuesses) db.bracketGuesses = db.bracketGuesses.filter(b => b.user !== oldName);
  if (db.oracle) db.oracle = db.oracle.filter(o => o.user !== oldName);

  writeDB(db);
  res.json({ success: true });
});

// ==========================================
// ROTAS DE PARTIDAS E PALPITES DE PLACAR
// ==========================================

app.get('/api/matches', (req, res) => {
  const db = readDB();
  res.json(db.matches || []);
});

app.post('/api/matches', (req, res) => {
  const { id, homeScore, awayScore, homeTeam, awayTeam, date, stage, group } = req.body;
  const db = readDB();

  const matchIndex = db.matches.findIndex(m => m.id === id);

  const hScore = homeScore === "" || homeScore === null || homeScore === undefined ? null : parseInt(homeScore, 10);
  const aScore = awayScore === "" || awayScore === null || awayScore === undefined ? null : parseInt(awayScore, 10);

  if (matchIndex !== -1) {
    db.matches[matchIndex] = {
      ...db.matches[matchIndex],
      homeScore: hScore,
      awayScore: aScore
    };

    if (homeTeam) db.matches[matchIndex].homeTeam = homeTeam;
    if (awayTeam) db.matches[matchIndex].awayTeam = awayTeam;
    if (date) db.matches[matchIndex].date = date;
    if (stage) db.matches[matchIndex].stage = stage;
    if (group) db.matches[matchIndex].group = group;
  } else {
    const newMatch = {
      id: id || String(db.matches.length + 1),
      homeTeam,
      awayTeam,
      homeScore: hScore,
      awayScore: aScore,
      date: date || new Date().toISOString(),
      stage: stage || 'group',
      group: group || 'Custom'
    };
    db.matches.push(newMatch);
  }

  writeDB(db);
  res.json({ success: true, matches: db.matches });
});

// Rota para bloquear/desbloquear palpites de uma partida (Admin)
app.post('/api/matches/:id/lock', (req, res) => {
  const { id } = req.params;
  const { locked } = req.body; // boolean
  const db = readDB();

  const matchIndex = db.matches.findIndex(m => String(m.id) === String(id));
  if (matchIndex === -1) {
    return res.status(404).json({ error: "Partida não encontrada." });
  }

  db.matches[matchIndex].locked = !!locked;
  writeDB(db);
  res.json({ success: true, match: db.matches[matchIndex] });
});

app.get('/api/guesses', (req, res) => {
  const db = readDB();
  res.json(db.guesses || []);
});

app.post('/api/guesses', (req, res) => {
  const { user, matchId, homeScore, awayScore } = req.body;
  const db = readDB();

  // Verificar se a partida está bloqueada ou já começou
  const match = db.matches.find(m => String(m.id) === String(matchId));
  if (match) {
    let isLocked = !!match.locked;
    if (match.date) {
      let cleanDate = match.date;
      const tIndex = match.date.indexOf('T');
      if (tIndex !== -1) {
        cleanDate = match.date.substring(0, tIndex + 9);
      }
      const formattedString = cleanDate.includes('T') ? `${cleanDate}-03:00` : `${cleanDate}T00:00:00-03:00`;
      const matchTime = new Date(formattedString);
      if (new Date() >= matchTime) {
        isLocked = true;
      }
    }
    if (isLocked) {
      return res.status(403).json({ error: "Esta partida já começou! Palpites bloqueados." });
    }
  }

  const guessIndex = db.guesses.findIndex(g => g.user === user && g.matchId === matchId);

  const hScore = homeScore === "" || homeScore === null || homeScore === undefined ? null : parseInt(homeScore, 10);
  const aScore = awayScore === "" || awayScore === null || awayScore === undefined ? null : parseInt(awayScore, 10);

  if (hScore === null || aScore === null) {
    if (guessIndex !== -1) {
      db.guesses.splice(guessIndex, 1);
    }
  } else {
    const guessData = {
      user,
      matchId,
      homeScore: hScore,
      awayScore: aScore,
      updatedAt: new Date().toISOString()
    };

    if (guessIndex !== -1) {
      db.guesses[guessIndex] = guessData;
    } else {
      db.guesses.push(guessData);
    }
  }

  writeDB(db);
  res.json({ success: true, guesses: db.guesses });
});

// ==========================================
// ROTAS DO CLASSIFICAÇÃO DE GRUPOS (1º E 2º)
// ==========================================

app.get('/api/group-qualifiers', (req, res) => {
  const db = readDB();
  res.json({
    guesses: db.groupQualifiers || [],
    results: db.groupQualifiersResults || {}
  });
});

app.post('/api/group-qualifiers', (req, res) => {
  const { user, group, first, second, third } = req.body;
  const db = readDB();

  // Regra de Trava Temporal: Bloqueia no início da Copa (11/06/2026 às 16:00:00)
  const COPA_START = new Date("2026-06-11T16:00:00");
  if (new Date() >= COPA_START) {
    return res.status(403).json({ error: "O prazo para classificação de grupos já expirou! Edição bloqueada." });
  }

  if (!db.groupQualifiers) db.groupQualifiers = [];

  const idx = db.groupQualifiers.findIndex(g => g.user === user && g.group === group);

  const data = { user, group, first, second, third, updatedAt: new Date().toISOString() };

  if (idx !== -1) {
    db.groupQualifiers[idx] = data;
  } else {
    db.groupQualifiers.push(data);
  }

  writeDB(db);
  res.json({ success: true, groupQualifiers: db.groupQualifiers });
});

app.post('/api/group-qualifiers/results', (req, res) => {
  const { group, first, second, third } = req.body;
  const db = readDB();

  if (!db.groupQualifiersResults) db.groupQualifiersResults = {};

  db.groupQualifiersResults[group] = { first, second, third };

  writeDB(db);
  res.json({ success: true, results: db.groupQualifiersResults });
});

// ==========================================
// ROTAS DE CHAVEAMENTO (MATA-MATA)
// ==========================================

app.get('/api/bracket', (req, res) => {
  const db = readDB();
  res.json({
    guesses: db.bracketGuesses || [],
    results: db.bracketResults || { oitavas: [], quartas: [], semis: [], finalists: [], champion: null, thirdPlace: null }
  });
});

app.post('/api/bracket', (req, res) => {
  const { user, oitavas, quartas, semis, finalists, champion, thirdPlace } = req.body;
  const db = readDB();

  if (!db.bracketGuesses) db.bracketGuesses = [];

  const idx = db.bracketGuesses.findIndex(b => b.user === user);

  const data = { user, oitavas, quartas, semis, finalists, champion, thirdPlace, updatedAt: new Date().toISOString() };

  if (idx !== -1) {
    db.bracketGuesses[idx] = data;
  } else {
    db.bracketGuesses.push(data);
  }

  writeDB(db);
  res.json({ success: true, bracketGuesses: db.bracketGuesses });
});

app.post('/api/bracket/results', (req, res) => {
  const { oitavas, quartas, semis, finalists, champion, thirdPlace } = req.body;
  const db = readDB();

  db.bracketResults = {
    oitavas: oitavas || [],
    quartas: quartas || [],
    semis: semis || [],
    finalists: finalists || [],
    champion: champion || null,
    thirdPlace: thirdPlace || null
  };

  writeDB(db);
  res.json({ success: true, results: db.bracketResults });
});

// ==========================================
// ROTAS DO ORÁCULO (PERGUNTAS BÔNUS)
// ==========================================

app.get('/api/oracle', (req, res) => {
  const db = readDB();
  res.json({
    guesses: db.oracle || [],
    results: db.oracleResults || {}
  });
});

app.post('/api/oracle', (req, res) => {
  const { user, champion, topScorer, bestAttack, zebra, firstRedCard, deception, mostGoalsMatch } = req.body;
  const db = readDB();

  // Regra de Trava Temporal: Bloqueia após o final do último jogo da primeira rodada (17/06/2026 às 22:00:00)
  const COPA_START = new Date("2026-06-17T22:00:00");
  if (new Date() >= COPA_START) {
    return res.status(403).json({ error: "O prazo para o Oráculo já expirou! Edição bloqueada." });
  }

  if (!db.oracle) db.oracle = [];

  const idx = db.oracle.findIndex(o => o.user === user);

  const data = {
    user,
    champion,
    topScorer,
    bestAttack,
    zebra,
    firstRedCard,
    deception,
    mostGoalsMatch,
    updatedAt: new Date().toISOString()
  };

  if (idx !== -1) {
    db.oracle[idx] = data;
  } else {
    db.oracle.push(data);
  }

  writeDB(db);
  res.json({ success: true, oracle: db.oracle });
});

app.post('/api/oracle/results', (req, res) => {
  const { champion, topScorer, bestAttack, zebra, firstRedCard, deception, mostGoalsMatch } = req.body;
  const db = readDB();

  db.oracleResults = {
    champion,
    topScorer,
    bestAttack,
    zebra,
    firstRedCard,
    deception,
    mostGoalsMatch
  };

  writeDB(db);
  res.json({ success: true, results: db.oracleResults });
});

// ==========================================
// ROTAS DE CONFIGURAÇÕES GERAIS
// ==========================================

app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings || { knockoutEnabled: false });
});

app.post('/api/settings', (req, res) => {
  const { knockoutEnabled } = req.body;
  const db = readDB();
  db.settings = {
    ...db.settings,
    knockoutEnabled: !!knockoutEnabled
  };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});


app.get('/api/points-adjustments', (req, res) => {
  const db = readDB();
  res.json(db.pointsAdjustments || []);
});

app.post('/api/points-adjustments', (req, res) => {
  const { user, points, description } = req.body;
  const db = readDB();
  if (!db.pointsAdjustments) db.pointsAdjustments = [];

  const idx = db.pointsAdjustments.findIndex(a => a.user.toLowerCase() === user.toLowerCase());
  const pts = parseInt(points, 10) || 0;

  if (pts === 0) {
    if (idx !== -1) {
      db.pointsAdjustments.splice(idx, 1);
    }
  } else {
    const data = { user, points: pts, description, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      db.pointsAdjustments[idx] = data;
    } else {
      db.pointsAdjustments.push(data);
    }
  }

  writeDB(db);
  res.json({ success: true, pointsAdjustments: db.pointsAdjustments });
});

// Servir arquivos estáticos do frontend em produção
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback para SPA (React Router / rotas do frontend)
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
