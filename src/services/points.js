/**
 * Calcula a pontuação obtida por um palpite com base no resultado real por aproximação.
 * 
 * Regra:
 * - 10 pontos: Acerto na mosca (Placar Exato).
 * - 7 pontos: Acertou o vencedor e o saldo de gols (ex: palpite 3-1, resultado 2-0).
 * - 5 pontos: Acertou apenas o vencedor (errou o saldo de gols).
 * - 5 pontos: Acertou um empate, mas errou a quantidade de gols (ex: palpite 1-1, resultado 2-2).
 * - 0 pontos: Errou o resultado completo.
 * 
 * @param {number|string} guessHome Gols palpitados para o time da casa
 * @param {number|string} guessAway Gols palpitados para o time visitante
 * @param {number|string} realHome Gols reais do time da casa
 * @param {number|string} realAway Gols reais do time visitante
 * @returns {{points: number, isExact: boolean, isWinner: boolean, isDiff: boolean}}
 */
export function calculateMatchScore(guessHome, guessAway, realHome, realAway) {
  if (
    realHome === null || realAway === null || 
    realHome === undefined || realAway === undefined ||
    guessHome === null || guessAway === null ||
    guessHome === undefined || guessAway === undefined
  ) {
    return { points: 0, isExact: false, isWinner: false, isDiff: false };
  }

  const gHome = parseInt(guessHome, 10);
  const gAway = parseInt(guessAway, 10);
  const rHome = parseInt(realHome, 10);
  const rAway = parseInt(realAway, 10);

  if (isNaN(gHome) || isNaN(gAway) || isNaN(rHome) || isNaN(rAway)) {
    return { points: 0, isExact: false, isWinner: false, isDiff: false };
  }

  // 1. Acerto na mosca (Placar Exato) -> 10 pontos
  if (gHome === rHome && gAway === rAway) {
    return { points: 10, isExact: true, isWinner: true, isDiff: true };
  }

  const guessDiff = gHome - gAway;
  const realDiff = rHome - rAway;

  const gotWinner = (guessDiff > 0 && realDiff > 0) || (guessDiff < 0 && realDiff < 0);
  const gotDraw = (guessDiff === 0 && realDiff === 0);

  // 2. Acertou um empate, mas errou a quantidade de gols -> 5 pontos
  if (gotDraw) {
    return { points: 5, isExact: false, isWinner: true, isDiff: false };
  }

  // 3. Acertou Vencedor
  if (gotWinner) {
    // 3a. Acertou o vencedor e o saldo/diferença de gols -> 7 pontos
    if (guessDiff === realDiff) {
      return { points: 7, isExact: false, isWinner: true, isDiff: true };
    }
    // 3b. Acertou apenas o vencedor (errou o saldo) -> 5 pontos
    return { points: 5, isExact: false, isWinner: true, isDiff: false };
  }

  return { points: 0, isExact: false, isWinner: false, isDiff: false };
}

/**
 * Verifica se o horário de início da partida já passou (considerando o fuso de Brasília).
 * @param {string} dateString Horário da partida no formato YYYY-MM-DDTHH:mm:ss
 * @returns {boolean}
 */
export function isMatchTimeOver(dateString) {
  if (!dateString) return false;
  let cleanDate = dateString;
  const tIndex = dateString.indexOf('T');
  if (tIndex !== -1) {
    cleanDate = dateString.substring(0, tIndex + 9);
  }
  const formattedString = cleanDate.includes('T') ? `${cleanDate}-03:00` : `${cleanDate}T00:00:00-03:00`;
  const matchTime = new Date(formattedString);
  return new Date() >= matchTime;
}
