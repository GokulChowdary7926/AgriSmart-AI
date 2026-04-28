describe('WeatherService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('parses open weather payload safely', () => {
    const service = require('../../services/WeatherService');

    const parsed = service.parseOpenWeatherData({
      main: { temp: 29, feels_like: 31, humidity: 70, pressure: 1008 },
      weather: [{ main: 'Clouds', description: 'scattered clouds' }],
      wind: { speed: 4.5, deg: 210 },
      clouds: { all: 35 },
      rain: { '1h': 2.1 },
      sys: { country: 'IN', sunrise: 1700000000, sunset: 1700040000 },
      name: 'Hyderabad'
    });

    expect(parsed.temperature).toBe(29);
    expect(parsed.humidity).toBe(70);
    expect(parsed.weather).toBe('Clouds');
    expect(parsed.location).toBe('Hyderabad');
    expect(parsed.country).toBe('IN');
  });

  test('returns mock soil data when resilient soil request fails', async () => {
    const request = jest.fn().mockResolvedValue({
      success: false,
      error: { message: 'timeout' }
    });
    jest.doMock('../../services/api/resilientHttpClient', () => ({ request }));

    const service = require('../../services/WeatherService');
    const data = await service.getSoilData(17.385, 78.4867);

    expect(request).toHaveBeenCalled();
    expect(data).toHaveProperty('ph');
    expect(data).toHaveProperty('soil_type');
    expect(data.source).toBe('AgriSmart AI');
  });
});
