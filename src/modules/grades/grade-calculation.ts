export type CalculationScore = {
  categoryId: string;
  categoryName: string;
  score: number;
  maxScore: number;
};

export function calculateSubjectAverage(
  scores: CalculationScore[],
  scaleMax = 10,
  weighted = false,
  weights = new Map<string, number>(),
) {
  if (!scores.length) return null;
  const categories = new Map<string, { name: string; values: number[] }>();
  scores.forEach((score) => {
    const current = categories.get(score.categoryId) ?? { name: score.categoryName, values: [] };
    current.values.push(score.score / score.maxScore);
    categories.set(score.categoryId, current);
  });
  const averages = [...categories.entries()].map(([categoryId, category]) => ({ categoryId, average: category.values.reduce((sum, value) => sum + value, 0) / category.values.length }));
  const configuredWeight = averages.reduce((sum, item) => sum + (weights.get(item.categoryId) ?? 0), 0);
  const normalized = weighted && configuredWeight > 0
    ? averages.reduce((sum, item) => sum + item.average * (weights.get(item.categoryId) ?? 0), 0) / configuredWeight
    : averages.reduce((sum, item) => sum + item.average, 0) / averages.length;
  return Number((normalized * scaleMax).toFixed(2));
}
