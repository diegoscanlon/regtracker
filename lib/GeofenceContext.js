import React, { createContext, useContext } from 'react';
import useGeofence from './useGeofence';

const GeofenceContext = createContext(null);

export function GeofenceProvider({ children }) {
  const geofence = useGeofence();
  return (
    <GeofenceContext.Provider value={geofence}>
      {children}
    </GeofenceContext.Provider>
  );
}

export function useGeofenceContext() {
  const ctx = useContext(GeofenceContext);
  if (!ctx) throw new Error('useGeofenceContext must be used within GeofenceProvider');
  return ctx;
}
