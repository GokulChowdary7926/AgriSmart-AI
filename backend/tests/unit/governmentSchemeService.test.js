describe('governmentSchemeService helper logic', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('calculateFinancialScore uses numeric benefit amount', () => {
    const service = require('../../services/governmentSchemeService');
    const score = service.calculateFinancialScore({
      benefits: { amount: '₹6,000 per year' }
    });

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('groupByCategory groups schemes correctly', () => {
    const service = require('../../services/governmentSchemeService');
    const grouped = service.groupByCategory([
      { schemeId: '1', category: 'financial' },
      { schemeId: '2', category: 'water' },
      { schemeId: '3', category: 'financial' }
    ]);

    expect(grouped.financial.length).toBe(2);
    expect(grouped.water.length).toBe(1);
  });

  test('getDeadlineAlerts includes only non-ongoing deadlines', () => {
    const service = require('../../services/governmentSchemeService');
    const alerts = service.getDeadlineAlerts([
      { schemeId: 'A', name: 'Scheme A', deadline: '2027-01-01' },
      { schemeId: 'B', name: 'Scheme B', deadline: 'Ongoing' }
    ]);

    expect(alerts.length).toBe(1);
    expect(alerts[0].schemeId).toBe('A');
  });

  test('checkSchemeEligibility returns not found for unknown scheme id', async () => {
    const service = require('../../services/governmentSchemeService');
    const result = await service.checkSchemeEligibility('UNKNOWN_SCHEME', {});

    expect(result.eligible).toBe(false);
    expect(result.error).toBe('Scheme not found');
  });

  test('calculateNeedsScore prioritizes matched category needs', () => {
    const service = require('../../services/governmentSchemeService');
    const score = service.calculateNeedsScore(
      { category: 'financial' },
      { needs: ['income_support'] }
    );

    expect(score).toBe(100);
  });

  test('safe generators return empty arrays when underlying methods throw', () => {
    const service = require('../../services/governmentSchemeService');
    jest.spyOn(service, 'generateRecommendationReasons').mockImplementation(() => {
      throw new Error('boom');
    });
    jest.spyOn(service, 'generateNextSteps').mockImplementation(() => {
      throw new Error('boom');
    });

    expect(service.safeGenerateRecommendationReasons([], {})).toEqual([]);
    expect(service.safeGenerateNextSteps([])).toEqual([]);
  });

  test('createMonthlyView buckets events by year-month', () => {
    const service = require('../../services/governmentSchemeService');
    const monthly = service.createMonthlyView([
      { date: '2026-05-10', schemeId: 'A' },
      { date: '2026-05-20', schemeId: 'B' },
      { date: '2026-06-01', schemeId: 'C' }
    ]);

    expect(monthly['2026-05']).toHaveLength(2);
    expect(monthly['2026-06']).toHaveLength(1);
  });
});
