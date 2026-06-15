import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'db.json');
const sqlPath = path.join(__dirname, 'supabase_schema.sql');

// Read files
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
let sql = fs.readFileSync(sqlPath, 'utf8');

// Helper to format date back to ISO-8601 YYYY-MM-DDTHH:mm:ss
const formatDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Map for 1st round
const firstRoundMap = {
  1: { day: 11, hour: 16 },
  2: { day: 11, hour: 23 },
  7: { day: 12, hour: 16 },
  19: { day: 12, hour: 22 },
  8: { day: 13, hour: 16 },
  13: { day: 13, hour: 19 },
  14: { day: 13, hour: 22 },
  20: { day: 14, hour: 1 },
  25: { day: 14, hour: 14 },
  31: { day: 14, hour: 17 },
  26: { day: 14, hour: 20 },
  32: { day: 14, hour: 23 },
  43: { day: 15, hour: 13 },
  37: { day: 15, hour: 16 },
  44: { day: 15, hour: 19 },
  38: { day: 15, hour: 22 },
  49: { day: 16, hour: 16 },
  50: { day: 16, hour: 19 },
  55: { day: 16, hour: 22 },
  56: { day: 17, hour: 1 },
  61: { day: 17, hour: 14 },
  67: { day: 17, hour: 17 },
  68: { day: 17, hour: 20 },
  62: { day: 17, hour: 23 }
};

const updateMatchDate = (id, dateStr) => {
  const d = new Date(dateStr);
  const idNum = parseInt(id, 10);
  const timeStr = dateStr.split('T')[1];
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  
  // 1. Check if in 1st round map
  if (firstRoundMap[idNum]) {
    const rule = firstRoundMap[idNum];
    d.setDate(rule.day);
    d.setHours(rule.hour, 0, 0);
    return formatDate(d);
  }
  
  // 2. Check if decisive/simultaneous phase (June 24-27)
  const day = d.getDate();
  const isDecisiveGroupPhase = d.getMonth() === 5 && day >= 24 && day <= 27; // June 24-27
  
  if (isDecisiveGroupPhase) {
    if (hours === 14) {
      d.setHours(17, 0, 0);
    } else if (hours === 16) {
      d.setHours(17, 0, 0);
    } else if (hours === 17) {
      d.setHours(21, 0, 0);
    } else if (hours === 20) {
      d.setHours(21, 0, 0);
    }
    return formatDate(d);
  }
  
  // 3. Regular group stage matches (June 18-23)
  if (d.getMonth() === 5 && day >= 18 && day <= 23) {
    if (hours === 11) {
      d.setHours(14, 0, 0);
    } else if (hours === 14) {
      d.setHours(17, 0, 0);
    } else if (hours === 17) {
      d.setHours(20, 0, 0);
    } else if (hours === 20) {
      d.setHours(23, 0, 0);
    } else if (hours === 23) {
      d.setDate(day + 1);
      d.setHours(1, 0, 0);
    }
    return formatDate(d);
  }
  
  // 4. Knockout stages (June 28 onwards)
  if (idNum >= 73 && idNum <= 88) { // 16-avos
    if (hours === 11) d.setHours(14, 0, 0);
    else if (hours === 14) d.setHours(17, 0, 0);
    else if (hours === 15) d.setHours(17, 0, 0);
    else if (hours === 18) d.setHours(21, 0, 0);
    else if (hours === 20) d.setHours(21, 0, 0);
    else if (hours === 22) d.setHours(22, 0, 0);
    return formatDate(d);
  }
  
  if (idNum >= 89 && idNum <= 96) { // Oitavas
    if (hours === 14) d.setHours(17, 0, 0);
    else if (hours === 20) d.setHours(21, 30, 0);
    return formatDate(d);
  }
  
  if (idNum >= 97 && idNum <= 100) { // Quartas
    if (hours === 14) d.setHours(17, 0, 0);
    else if (hours === 17) d.setHours(17, 0, 0);
    else if (hours === 20) d.setHours(21, 0, 0);
    return formatDate(d);
  }
  
  if (idNum === 101 || idNum === 102) { // Semis
    if (hours === 20) d.setHours(21, 0, 0);
    return formatDate(d);
  }
  
  if (idNum === 103) { // 3rd Place
    if (hours === 17) d.setHours(17, 0, 0);
    return formatDate(d);
  }
  
  if (idNum === 104) { // Final
    if (hours === 17) d.setHours(16, 0, 0);
    return formatDate(d);
  }
  
  return dateStr;
};

// Update matches in db.json
db.matches.forEach(m => {
  const oldDate = m.date;
  const newDate = updateMatchDate(m.id, oldDate);
  m.date = newDate;
  
  // Also update in sql string
  // Format: (1, 'México', 'África do Sul', 2, 0, '2026-06-11T17:00:00'
  const regex = new RegExp(`\\(${m.id},\\s*'[^']+',\\s*'[^']+',\\s*(?:NULL|\\d+),\\s*(?:NULL|\\d+),\\s*'${oldDate}'`);
  const sqlMatch = sql.match(regex);
  if (sqlMatch) {
    const updatedSqlRow = sqlMatch[0].replace(`'${oldDate}'`, `'${newDate}'`);
    sql = sql.replace(sqlMatch[0], updatedSqlRow);
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('Matches dates/times successfully updated in db.json and supabase_schema.sql!');
