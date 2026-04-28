describe('locationService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('searchByQuery maps nominatim search results', async () => {
    const request = jest.fn().mockResolvedValue({
      success: true,
      response: {
        data: [
          {
            display_name: 'Hyderabad, Telangana, India',
            lat: '17.3850',
            lon: '78.4867',
            address: {
              city: 'Hyderabad',
              state: 'Telangana',
              country: 'India',
              district: 'Hyderabad'
            }
          }
        ]
      }
    });
    jest.doMock('../../services/api/resilientHttpClient', () => ({ request }));

    const service = require('../../services/locationService');
    const results = await service.searchByQuery('Hyderabad');

    expect(request).toHaveBeenCalled();
    expect(results.length).toBe(1);
    expect(results[0].city).toBe('Hyderabad');
    expect(results[0].state).toBe('Telangana');
  });

  test('getLocationFromCoordinates returns fallback on request failure', async () => {
    const request = jest.fn().mockResolvedValue({
      success: false,
      error: { message: 'nominatim down' }
    });
    jest.doMock('../../services/api/resilientHttpClient', () => ({ request }));

    const service = require('../../services/locationService');
    const location = await service.getLocationFromCoordinates(17.385, 78.4867);

    expect(location.city).toBe('Unknown');
    expect(location.country).toBe('India');
    expect(location.coordinates).toEqual([78.4867, 17.385]);
  });

  test('getLocationData merges location soil and weather payloads', async () => {
    const service = require('../../services/locationService');
    jest.spyOn(service, 'getLocationFromCoordinates').mockResolvedValue({
      address: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      pincode: '500001'
    });
    jest.spyOn(service, 'getSoilType').mockResolvedValue({
      type: 'red',
      ph: 6.2,
      organicMatter: 'low',
      drainage: 'good'
    });
    jest.spyOn(service, 'getWeatherForLocation').mockResolvedValue({
      temperature: 29,
      rainfall: 3,
      humidity: 68,
      conditions: 'Cloudy'
    });

    const payload = await service.getLocationData(17.385, 78.4867);

    expect(payload.location.city).toBe('Hyderabad');
    expect(payload.soil.soilType).toBe('red');
    expect(payload.weather.temperature).toBe(29);
    expect(payload.pH).toBe(6.2);
  });
});
