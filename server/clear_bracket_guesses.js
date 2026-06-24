import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const originalGuessesCount = db.bracketGuesses ? db.bracketGuesses.length : 0;
  db.bracketGuesses = [];
  
  // Também vamos limpar os resultados oficiais se houver
  db.bracketResults = { oitavas: [], quartas: [], semis: [], finalists: [], champion: null };
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Successfully cleared ${originalGuessesCount} bracket guesses and official results from db.json!`);
} else {
  console.log("db.json not found!");
}
