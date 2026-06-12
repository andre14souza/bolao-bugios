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
        bracketResults: { quartas: [], semis: [], finalists: [], champion: null }, 
        oracle: [], 
        oracleResults: {} 
      };
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler banco de dados local:", err);
    return { 
      matches: [], 
      guesses: [], 
      groupQualifiers: [], 
      groupQualifiersResults: {}, 
      bracketGuesses: [], 
      bracketResults: { quartas: [], semis: [], finalists: [], champion: null }, 
      oracle: [], 
      oracleResults: {} 
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

app.get('/api/guesses', (req, res) => {
  const db = readDB();
  res.json(db.guesses || []);
});

app.post('/api/guesses', (req, res) => {
  const { user, matchId, homeScore, awayScore } = req.body;
  const db = readDB();
  
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
    results: db.bracketResults || { quartas: [], semis: [], finalists: [], champion: null }
  });
});

app.post('/api/bracket', (req, res) => {
  const { user, quartas, semis, finalists, champion } = req.body;
  const db = readDB();
  
  if (!db.bracketGuesses) db.bracketGuesses = [];
  
  const idx = db.bracketGuesses.findIndex(b => b.user === user);
  
  const data = { user, quartas, semis, finalists, champion, updatedAt: new Date().toISOString() };
  
  if (idx !== -1) {
    db.bracketGuesses[idx] = data;
  } else {
    db.bracketGuesses.push(data);
  }
  
  writeDB(db);
  res.json({ success: true, bracketGuesses: db.bracketGuesses });
});

app.post('/api/bracket/results', (req, res) => {
  const { quartas, semis, finalists, champion } = req.body;
  const db = readDB();
  
  db.bracketResults = {
    quartas: quartas || [],
    semis: semis || [],
    finalists: finalists || [],
    champion: champion || null
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
