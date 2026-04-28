describe('governmentAPIService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('getPMKISANStatus returns hashed beneficiary response', async () => {
    const service = require('../../services/governmentAPIService');
    const result = await service.getPMKISANStatus('123412341234', null);

    expect(result.success).toBe(true);
    expect(result.data.beneficiary_id).toMatch(/^PMKISAN_/);
    expect(result.data.installments.length).toBe(3);
  });

  test('getMSPPrices returns crop-specific data', async () => {
    const service = require('../../services/governmentAPIService');
    const result = await service.getMSPPrices('wheat', 2024);

    expect(result.success).toBe(true);
    expect(result.crop).toBe('wheat');
    expect(result.msp).toBe(2275);
    expect(result.unit).toBe('₹ per quintal');
  });

  test('getSubsidies includes state adjustment percentage', async () => {
    const service = require('../../services/governmentAPIService');
    const result = await service.getSubsidies('rice', 'Punjab');

    expect(result.success).toBe(true);
    expect(result.state_adjustment).toBe('+10%');
    expect(result.subsidies).toHaveProperty('fertilizer');
  });
});
