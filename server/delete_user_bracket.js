import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db.json');

if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const originalLength = db.bracketGuesses ? db.bracketGuesses.length : 0;
  
  if (db.bracketGuesses) {
    db.bracketGuesses = db.bracketGuesses.filter(
      b => b.user.toLowerCase() !== 'andre' && b.user.toLowerCase() !== 'andré'
    );
  }
  
  const newLength = db.bracketGuesses ? db.bracketGuesses.length : 0;
  const deletedCount = originalLength - newLength;
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Successfully deleted ${deletedCount} bracket predictions for user 'andre'/'André' from db.json.`);
} else {
  console.log("db.json not found!");
}
