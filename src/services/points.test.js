import { calculateMatchScore } from './points.js';

const runTests = () => {
  const tests = [
    { guess: [2, 1], real: [2, 1], expectedPoints: 10, expectedExact: true, desc: "Placar Exato 2-1 (10 pts)" },
    { guess: [1, 1], real: [1, 1], expectedPoints: 10, expectedExact: true, desc: "Placar Exato Empate 1-1 (10 pts)" },
    { guess: [3, 1], real: [2, 0], expectedPoints: 7, expectedExact: false, desc: "Vencedor e Saldo de Gols 3-1 vs 2-0 (7 pts)" },
    { guess: [2, 1], real: [3, 2], expectedPoints: 7, expectedExact: false, desc: "Vencedor e Saldo de Gols 2-1 vs 3-2 (7 pts)" },
    { guess: [3, 1], real: [1, 0], expectedPoints: 5, expectedExact: false, desc: "Apenas Vencedor 3-1 vs 1-0 (5 pts)" },
    { guess: [1, 1], real: [2, 2], expectedPoints: 5, expectedExact: false, desc: "Empate não exato 1-1 vs 2-2 (5 pts)" },
    { guess: [2, 0], real: [0, 2], expectedPoints: 0, expectedExact: false, desc: "Erro total (0 pts)" },
    { guess: [null, null], real: [2, 1], expectedPoints: 0, expectedExact: false, desc: "Sem palpite (0 pts)" },
    { guess: [2, 1], real: [null, null], expectedPoints: 0, expectedExact: false, desc: "Partida não jogada (0 pts)" },
    // Casos do mata-mata
    { guess: [2, 1], real: [2, 1], stage: "knockout", group: "16-avos de Final", expectedPoints: 15, expectedExact: true, desc: "Mata-mata 16-avos: Exato 2-1 (15 pts)" },
    { guess: [3, 1], real: [2, 0], stage: "knockout", group: "16-avos de Final", expectedPoints: 11, expectedExact: false, desc: "Mata-mata 16-avos: Vencedor e Saldo (11 pts)" },
    { guess: [3, 1], real: [1, 0], stage: "knockout", group: "16-avos de Final", expectedPoints: 8, expectedExact: false, desc: "Mata-mata 16-avos: Vencedor apenas (8 pts)" },
    { guess: [2, 1], real: [2, 1], stage: "knockout", group: "Oitavas de Final", expectedPoints: 20, expectedExact: true, desc: "Mata-mata Oitavas: Exato 2-1 (20 pts)" },
    { guess: [2, 1], real: [2, 1], stage: "knockout", group: "Final", expectedPoints: 50, expectedExact: true, desc: "Mata-mata Final: Exato 2-1 (50 pts)" }
  ];

  console.log("=== INICIANDO TESTES DE PONTUAÇÃO POR APROXIMAÇÃO ===");
  let passed = 0;
  tests.forEach((t, i) => {
    const result = calculateMatchScore(t.guess[0], t.guess[1], t.real[0], t.real[1], t.stage, t.group);
    const ptsOk = result.points === t.expectedPoints;
    const exactOk = result.isExact === t.expectedExact;
    if (ptsOk && exactOk) {
      console.log(`[PASS] Teste ${i+1}: ${t.desc}`);
      passed++;
    } else {
      console.error(`[FAIL] Teste ${i+1}: ${t.desc} (Esperava ${t.expectedPoints} pts, obteve ${result.points} pts)`);
    }
  });

  console.log(`\nResultado final: ${passed}/${tests.length} testes passaram.`);
  if (passed !== tests.length) {
    process.exit(1);
  }
};

runTests();
