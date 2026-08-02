import { calculateSubjectAverage } from "./grade-calculation";

describe("calculateSubjectAverage", () => {
  const scores = [
    { categoryId: "exam", categoryName: "Examen", score: 8, maxScore: 10 },
    { categoryId: "homework", categoryName: "Tarea", score: 10, maxScore: 10 },
  ];

  it("calculates the simple average of categories", () => {
    expect(calculateSubjectAverage(scores)).toBe(9);
  });

  it("applies configured weights and normalizes incomplete categories", () => {
    expect(calculateSubjectAverage(scores, 10, true, new Map([["exam", 0.7], ["homework", 0.3]]))).toBe(8.6);
    expect(calculateSubjectAverage([scores[0]], 10, true, new Map([["exam", 0.7], ["homework", 0.3]]))).toBe(8);
  });

  it("returns null when there are no graded scores", () => {
    expect(calculateSubjectAverage([])).toBeNull();
  });
});
