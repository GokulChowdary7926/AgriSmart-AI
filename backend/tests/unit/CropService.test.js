describe('CropService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('parses soil data from resilient client response', async () => {
    const request = jest.fn().mockResolvedValue({
      success: true,
      response: {
        data: {
          properties: {
            layers: [
              { values: { mean: 68 } },
              { values: { mean: 16 } },
              { values: { mean: 32 } }
            ]
          }
        }
      }
    });

    jest.doMock('../../services/api/resilientHttpClient', () => ({ request }));
    const service = require('../../services/CropService');

    const soil = await service.getRealTimeSoilData({ lat: 17.3, lng: 78.5 });

    expect(request).toHaveBeenCalled();
    expect(soil).toEqual({
      pH: 6.8,
      organicCarbon: 1.6,
      clayContent: 32
    });
  });

  test('returns fallback soil data when resilient client fails', async () => {
    const request = jest.fn().mockResolvedValue({
      success: false,
      error: { message: 'timeout' }
    });

    jest.doMock('../../services/api/resilientHttpClient', () => ({ request }));
    const service = require('../../services/CropService');

    const soil = await service.getRealTimeSoilData({ lat: 17.3, lng: 78.5 });

    expect(soil).toEqual({
      pH: 6.5,
      organicCarbon: 1.2,
      clayContent: 25
    });
  });
});
