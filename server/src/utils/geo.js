// Major Indian cities lookup table for automatic geographic coordinate resolution
export const CITY_COORDINATES = {
  'new delhi': { city: 'New Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
  'delhi': { city: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
  'mumbai': { city: 'Mumbai', state: 'Maharashtra', latitude: 19.0760, longitude: 72.8777 },
  'bengaluru': { city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  'bangalore': { city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  'patna': { city: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376 },
  'kolkata': { city: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  'chennai': { city: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  'hyderabad': { city: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867 },
  'pune': { city: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  'ahmedabad': { city: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
  'jaipur': { city: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  'lucknow': { city: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
  'chandigarh': { city: 'Chandigarh', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
  'kochi': { city: 'Kochi', state: 'Kerala', latitude: 9.9312, longitude: 76.2673 },
  'guwahati': { city: 'Guwahati', state: 'Assam', latitude: 26.1445, longitude: 91.7362 },
  'bhubaneswar': { city: 'Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 }
};

// Resolve coordinates and state for a city name, using provided overrides if available
export const resolveCityCoordinates = (cityName, customState, customLat, customLng) => {
  if (!cityName) {
    return {
      city: 'Unknown',
      state: customState || 'Unknown',
      latitude: customLat ?? 20.5937,
      longitude: customLng ?? 78.9629
    };
  }

  const key = cityName.trim().toLowerCase();
  const matched = CITY_COORDINATES[key];

  return {
    city: matched ? matched.city : cityName.trim(),
    state: customState || (matched ? matched.state : 'Unknown'),
    latitude: customLat !== undefined && customLat !== null ? Number(customLat) : (matched ? matched.latitude : 20.5937),
    longitude: customLng !== undefined && customLng !== null ? Number(customLng) : (matched ? matched.longitude : 78.9629)
  };
};
