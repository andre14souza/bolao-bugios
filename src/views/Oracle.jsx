import React, { useState, useEffect } from 'react';
import { Save, Check, Lock, AlertCircle } from 'lucide-react';
import { saveOracle } from '../services/api';

const QUESTIONS = [
  { key: 'champion', label: 'Quem será o Grande Campeão?', desc: 'Preveja a seleção que vai levantar a taça da Copa.' },
  { key: 'topScorer', label: 'Quem será o Artilheiro da Copa (Chuteira de Ouro)?', desc: 'Nome do jogador que marcará mais gols.' },
  { key: 'bestAttack', label: 'Qual seleção terá o Melhor Ataque na fase de grupos?', desc: 'A equipe que marcará mais gols nos 3 primeiros jogos de grupo.' },
  { key: 'zebra', label: 'Quem será a grande \'Zebra\' da Copa?', desc: 'A seleção menor que chegará mais longe ou surpreenderá gigantes.' },
  { key: 'firstRedCard', label: 'Qual jogador vai tomar o primeiro cartão vermelho?', desc: 'O primeiro jogador a ser expulso na Copa (IA Pick).' },
  { key: 'deception', label: 'Qual seleção vai ser a maior decepção (sair cedo)?', desc: 'O país favorito que cairá ainda na primeira fase ou oitavas (IA Pick).' },
  { key: 'mostGoalsMatch', label: 'Qual jogo da primeira fase terá mais gols?', desc: 'Diga o confronto. Exemplo: Brasil x Croácia (IA Pick).' }
];

export default function Oracle({ oracle, currentUser, onReload }) {
  const [localAnswers, setLocalAnswers] = useState({
    champion: '',
    topScorer: '',
    bestAttack: '',
    zebra: '',
    firstRedCard: '',
    deception: '',
    mostGoalsMatch: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Verifica se a Copa já começou e carrega palpites
  useEffect(() => {
    // Data limite de envio (final do último jogo da primeira rodada)
    const COPA_START = new Date("2026-06-17T22:00:00");
    if (new Date() >= COPA_START) {
      setIsLocked(true);
    }
    
    const userAns = oracle.guesses.find(o => o.user === currentUser);
    if (userAns) {
      setLocalAnswers({
        champion: userAns.champion || '',
        topScorer: userAns.topScorer || '',
        bestAttack: userAns.bestAttack || '',
        zebra: userAns.zebra || '',
        firstRedCard: userAns.firstRedCard || '',
        deception: userAns.deception || '',
        mostGoalsMatch: userAns.mostGoalsMatch || ''
      });
    }
  }, [oracle, currentUser]);

  const handleInputChange = (key, val) => {
    if (isLocked) return;
    setLocalAnswers(prev => ({
      ...prev,
      [key]: val
    }));
    setSaveStatus(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await saveOracle({
        user: currentUser,
        ...localAnswers
      });
      setSaveStatus('success');
      onReload();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const actual = oracle.results || {};
  const hasActualResults = Object.values(actual).some(v => v !== null && v !== '');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative bg-field-pattern animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            🔮 O Oráculo (Perguntas Bônus)
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Palpites bônus sobre as estatísticas da Copa de 2026. Suas respostas são trancadas assim que a bola rolar!
          </p>
        </div>

        {!isLocked && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-football-vibrantGreen to-emerald-600 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer font-sans"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={18} />
            )}
            <span>Salvar Oráculo</span>
          </button>
        )}
      </div>

      {/* Banner de bloqueio temporal */}
      {isLocked && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 text-sm font-semibold select-none">
          <Lock size={20} className="stroke-[2.5]" />
          <div>
            <p className="font-bold">🔒 Oráculo Trancado!</p>
            <p className="text-xs text-rose-300 font-medium">As previsões bônus fecharam no dia 17/06/2026 às 22h00 (fim da primeira rodada).</p>
          </div>
        </div>
      )}

      {/* Alertas de Feedback */}
      {saveStatus === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <Check size={18} />
          <span>Suas respostas foram guardadas na urna do Oráculo!</span>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-sm font-semibold animate-slideDown">
          <AlertCircle size={18} />
          <span>Ocorreu um erro. Certifique-se de que o prazo de envio não expirou.</span>
        </div>
      )}

      {/* Formulário de Perguntas */}
      <div className="flex flex-col gap-6">
        {QUESTIONS.map(q => {
          const userAns = localAnswers[q.key] || '';
          const realAns = actual[q.key] || '';
          const hasResult = realAns !== null && realAns !== '';
          // Comparação case-insensitive e aparando espaços vazios
          const isCorrect = hasResult && userAns.trim().toLowerCase() === realAns.trim().toLowerCase();

          return (
            <div key={q.key} className="glass-panel p-5 rounded-2xl border border-football-glassBorder flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-grow">
                <label className="block text-base font-bold text-white mb-0.5 select-none">
                  {q.label}
                </label>
                <span className="text-xs text-slate-400 block mb-2 select-none">{q.desc}</span>
                
                <input
                  type="text"
                  value={userAns}
                  disabled={isLocked || hasResult}
                  onChange={(e) => handleInputChange(q.key, e.target.value)}
                  className={`w-full p-3 rounded-xl text-sm font-semibold glass-input focus:border-football-gold ${
                    isLocked || hasResult ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  placeholder="Sua previsão..."
                />
              </div>

              {/* Resultados reais e pontos ganhos */}
              {hasResult && (
                <div className="md:w-1/3 flex flex-col items-center md:items-end justify-center gap-2 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                  <div className="text-center md:text-right select-none">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Oficial:</span>
                    <span className="text-sm font-extrabold text-football-gold text-glow-gold capitalize block">
                      {realAns}
                    </span>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border select-none ${
                    isCorrect
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}>
                    {isCorrect ? '🎯 Acertou (+5 pts)' : '❌ Errou (0 pts)'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
