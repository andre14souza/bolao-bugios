import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
const dbPath = path.join(__dirname, 'db.json');

// Helper to extract env variables without external dotenv package
const getEnvVar = (content, name) => {
  const match = content.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

async function run() {
  if (!fs.existsSync(envPath)) {
    console.error("❌ Erro: Arquivo .env não encontrado na raiz do projeto!");
    console.log("Se você estiver testando localmente sem Supabase (usando apenas o db.json), ignore este script.");
    console.log("Se estiver usando Supabase, certifique-se de configurar as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseUrl = getEnvVar(envContent, 'VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnvVar(envContent, 'VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidos no arquivo .env!");
    process.exit(1);
  }

  console.log("🔌 Conectando ao Supabase em:", supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  if (!fs.existsSync(dbPath)) {
    console.error("❌ Erro: Banco de dados local db.json não encontrado em server/db.json!");
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log(`🔄 Iniciando atualização de ${db.matches.length} partidas no Supabase...`);

  let successCount = 0;
  let errorCount = 0;

  for (const m of db.matches) {
    const { error } = await supabase
      .from('matches')
      .update({ date: m.date })
      .eq('id', parseInt(m.id, 10));

    if (error) {
      console.error(`❌ Erro ao atualizar partida ${m.id} (${m.homeTeam} x ${m.awayTeam}):`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Partida ${m.id} (${m.homeTeam} x ${m.awayTeam}) atualizada para ${m.date}`);
      successCount++;
    }
  }

  console.log(`\n🎉 Atualização concluída! Sucessos: ${successCount}, Erros: ${errorCount}`);
}

run().catch(err => {
  console.error("❌ Um erro inesperado ocorreu durante a execução do script:", err);
});
