const STORAGE_KEY = 'agri:lastKnownLocation';

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLocation = (input) => {
  if (!input || typeof input !== 'object') return null;
  const lat = toFiniteNumber(input.lat ?? input.latitude);
  const lng = toFiniteNumber(input.lng ?? input.longitude);
  if (lat === null || lng === null) return null;

  return {
    lat,
    lng,
    city: input.city || null,
    district: input.district || null,
    state: input.state || null,
    country: input.country || 'India',
    address: input.address || input.display_name || null,
    source: input.source || 'gps',
    updatedAt: input.updatedAt || new Date().toISOString()
  };
};

export const getStoredLocation = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeLocation(JSON.parse(raw));
  } catch (_) {
    return null;
  }
};

export const setStoredLocation = (location) => {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

const geolocate = (timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0
    });
  });

export const detectRealtimeLocation = async (api, language = 'en') => {
  const position = await geolocate();
  const lat = toFiniteNumber(position?.coords?.latitude);
  const lng = toFiniteNumber(position?.coords?.longitude);
  if (lat === null || lng === null) {
    throw new Error('Invalid coordinates');
  }

  let enriched = {
    lat,
    lng,
    source: 'gps',
    updatedAt: new Date().toISOString()
  };

  try {
    const response = await api.get('/map/reverse-geocode', {
      params: {
        latitude: lat,
        longitude: lng,
        language: language || 'en'
      }
    });
    const address = response?.data?.data?.address || response?.data?.address || null;
    if (address) {
      enriched = {
        ...enriched,
        city: address.city || null,
        district: address.district || null,
        state: address.state || null,
        country: address.country || 'India',
        address: address.address || address.formatted || null
      };
    }
  } catch (_) {
    // Reverse geocode is best-effort; coordinates are still valid.
  }

  return setStoredLocation(enriched);
};

export const getBestAvailableLocation = async (api, language = 'en') => {
  try {
    return await detectRealtimeLocation(api, language);
  } catch (_) {
    return getStoredLocation();
  }
};
