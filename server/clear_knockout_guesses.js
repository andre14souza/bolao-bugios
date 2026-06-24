import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // 1. Limpar palpites do chaveamento
  const originalBracketGuessesCount = db.bracketGuesses ? db.bracketGuesses.length : 0;
  db.bracketGuesses = [];
  db.bracketResults = { oitavas: [], quartas: [], semis: [], finalists: [], champion: null };

  // 2. Identificar quais partidas são do mata-mata (stage === 'knockout')
  const knockoutMatchIds = new Set(
    (db.matches || [])
      .filter(m => m.stage === 'knockout')
      .map(m => String(m.id))
  );

  // 3. Limpar palpites individuais das partidas do mata-mata
  const originalGuessesCount = db.guesses ? db.guesses.length : 0;
  if (db.guesses) {
    db.guesses = db.guesses.filter(g => !knockoutMatchIds.has(String(g.matchId)));
  }
  const removedGuessesCount = originalGuessesCount - (db.guesses ? db.guesses.length : 0);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Successfully cleared:`);
  console.log(`- ${originalBracketGuessesCount} bracket guesses`);
  console.log(`- ${removedGuessesCount} individual knockout match guesses`);
} else {
  console.log("db.json not found!");
}
