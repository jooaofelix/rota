/** Calcula o nível do paciente a partir da pontuação total (100 pontos por nível). */
export function levelFromPoints(points: number): number {
  return Math.max(1, Math.floor(points / 100) + 1);
}

export function pointsToNextLevel(points: number): { current: number; target: number; percent: number } {
  const level = levelFromPoints(points);
  const base = (level - 1) * 100;
  const target = level * 100;
  const current = points - base;
  return { current, target: 100, percent: Math.round((current / 100) * 100) };
}
