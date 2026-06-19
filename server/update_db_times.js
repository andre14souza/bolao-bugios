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

// Map of exact BRT times for all group stage matches (IDs 1-72)
const groupStageDates = {
  1: '2026-06-11T16:00:00',
  2: '2026-06-11T23:00:00',
  3: '2026-06-18T13:00:00',
  4: '2026-06-18T22:00:00',
  5: '2026-06-24T22:00:00',
  6: '2026-06-24T22:00:00',
  7: '2026-06-12T16:00:00',
  8: '2026-06-13T16:00:00',
  9: '2026-06-18T16:00:00',
  10: '2026-06-18T19:00:00',
  11: '2026-06-24T16:00:00',
  12: '2026-06-24T16:00:00',
  13: '2026-06-13T19:00:00',
  14: '2026-06-13T22:00:00',
  15: '2026-06-19T19:00:00',
  16: '2026-06-19T21:30:00',
  17: '2026-06-24T19:00:00',
  18: '2026-06-24T19:00:00',
  19: '2026-06-12T22:00:00',
  20: '2026-06-14T01:00:00',
  21: '2026-06-19T16:00:00',
  22: '2026-06-19T01:00:00',
  23: '2026-06-25T23:00:00',
  24: '2026-06-25T23:00:00',
  25: '2026-06-14T14:00:00',
  26: '2026-06-14T20:00:00',
  27: '2026-06-20T17:00:00',
  28: '2026-06-20T21:00:00',
  29: '2026-06-25T17:00:00',
  30: '2026-06-25T17:00:00',
  31: '2026-06-14T17:00:00',
  32: '2026-06-14T23:00:00',
  33: '2026-06-20T14:00:00',
  34: '2026-06-21T01:00:00',
  35: '2026-06-25T20:00:00',
  36: '2026-06-25T20:00:00',
  37: '2026-06-15T16:00:00',
  38: '2026-06-15T22:00:00',
  39: '2026-06-21T16:00:00',
  40: '2026-06-21T22:00:00',
  41: '2026-06-26T00:00:00',
  42: '2026-06-26T00:00:00',
  43: '2026-06-15T13:00:00',
  44: '2026-06-15T19:00:00',
  45: '2026-06-21T13:00:00',
  46: '2026-06-21T19:00:00',
  47: '2026-06-26T21:00:00',
  48: '2026-06-26T21:00:00',
  49: '2026-06-16T16:00:00',
  50: '2026-06-16T19:00:00',
  51: '2026-06-22T18:00:00',
  52: '2026-06-22T21:00:00',
  53: '2026-06-26T16:00:00',
  54: '2026-06-26T16:00:00',
  55: '2026-06-16T22:00:00',
  56: '2026-06-17T01:00:00',
  57: '2026-06-22T14:00:00',
  58: '2026-06-23T00:00:00',
  59: '2026-06-27T23:00:00',
  60: '2026-06-27T23:00:00',
  61: '2026-06-17T14:00:00',
  62: '2026-06-17T23:00:00',
  63: '2026-06-23T14:00:00',
  64: '2026-06-23T23:00:00',
  65: '2026-06-27T19:30:00',
  66: '2026-06-27T19:30:00',
  67: '2026-06-17T17:00:00',
  68: '2026-06-17T20:00:00',
  69: '2026-06-23T17:00:00',
  70: '2026-06-23T20:00:00',
  71: '2026-06-27T17:00:00',
  72: '2026-06-27T17:00:00'
};

const updateMatchDate = (id, dateStr) => {
  const d = new Date(dateStr);
  const idNum = parseInt(id, 10);
  const timeStr = dateStr.split('T')[1];
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  
  // 1. Check if in group stage map
  if (idNum >= 1 && idNum <= 72) {
    if (groupStageDates[idNum]) {
      return groupStageDates[idNum];
    }
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
