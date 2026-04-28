const LandConverter = require('../../utils/landConverter');

describe('LandConverter', () => {
  test('toHectares converts square feet correctly (107639.104 sqft = 1 ha)', () => {
    expect(LandConverter.toHectares(107639.104, 0)).toBe(1);
    expect(LandConverter.toHectares(0, 0)).toBe(0);
  });

  test('toHectares folds cents into total area (1 cent ≈ 435.6 sqft)', () => {
    expect(LandConverter.toHectares(0, 247.105)).toBeCloseTo(1, 1);
  });

  test('toHectares rounds to 2 decimal places', () => {
    const result = LandConverter.toHectares(54000, 0);
    expect(Number.isFinite(result)).toBe(true);
    expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
  });

  test('toHectares default arguments yield zero', () => {
    expect(LandConverter.toHectares()).toBe(0);
  });

  test('toSquareFeet inverts toHectares', () => {
    expect(LandConverter.toSquareFeet(1)).toBeCloseTo(107639.104, 3);
    expect(LandConverter.toSquareFeet(2.5)).toBeCloseTo(269097.76, 2);
  });

  test('toCents converts hectares to cents', () => {
    expect(LandConverter.toCents(1)).toBeCloseTo(247.105, 3);
  });

  test('toAcres / acresToHectares are inverses', () => {
    expect(LandConverter.toAcres(1)).toBeCloseTo(2.47105, 5);
    expect(LandConverter.acresToHectares(2.47105)).toBeCloseTo(1, 5);
  });

  test('squareFeetToAcres / acresToSquareFeet round-trip', () => {
    expect(LandConverter.squareFeetToAcres(43560)).toBeCloseTo(1, 5);
    expect(LandConverter.acresToSquareFeet(1)).toBe(43560);
  });
});
