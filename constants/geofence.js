// Regenstein Library geofence

// Polygon tracing the building footprint (converted from DMS to decimal)
export const REG_POLYGON = [
  { latitude: 41.79272, longitude: -87.59919 },
  { latitude: 41.79161, longitude: -87.59925 },
  { latitude: 41.79164, longitude: -87.59953 },
  { latitude: 41.79182, longitude: -87.59975 },
  { latitude: 41.79150, longitude: -87.60110 },
  { latitude: 41.79191, longitude: -87.60122 },
  { latitude: 41.79231, longitude: -87.60114 },
  { latitude: 41.79240, longitude: -87.60067 },
  { latitude: 41.79273, longitude: -87.60068 },
];

// Center of the polygon (average of all vertices)
export const REG_CENTER = {
  latitude: 41.79207,
  longitude: -87.60028,
};

// Radius large enough to enclose the full polygon (~110m)
export const REG_RADIUS = 90;

export const GEOFENCE_TASK_NAME = 'REGTRACKER_GEOFENCE';
