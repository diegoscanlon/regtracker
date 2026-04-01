import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { REG_CENTER, REG_RADIUS, REG_POLYGON, GEOFENCE_TASK_NAME } from '../constants/geofence';
import pointInPolygon from './pointInPolygon';

async function startSession() {
  const existing = await SecureStore.getItemAsync('session_start_ts');
  if (existing) return existing; // already active

  const now = new Date().toISOString();
  await SecureStore.setItemAsync('session_start_ts', now);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('location_sessions')
        .insert({ user_id: user.id, started_at: now })
        .select('id')
        .single();
      if (data) await SecureStore.setItemAsync('active_session_id', data.id);
    }
  } catch (err) {
    console.error('[useGeofence] startSession error:', err);
  }

  return now;
}

async function endSession() {
  const sessionId = await SecureStore.getItemAsync('active_session_id');
  if (sessionId) {
    try {
      await supabase
        .from('location_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (err) {
      console.error('[useGeofence] endSession error:', err);
    }
  }
  await SecureStore.deleteItemAsync('session_start_ts');
  await SecureStore.deleteItemAsync('active_session_id');
}

// Set to true to simulate being inside the Reg (dev only)
const DEV_FORCE_IN_REG = __DEV__ && false;

export default function useGeofence() {
  const [userLocation, setUserLocation] = useState(
    DEV_FORCE_IN_REG ? { latitude: 41.79207, longitude: -87.60028 } : null
  );
  const [isInReg, setIsInReg] = useState(DEV_FORCE_IN_REG);
  const [sessionStartTs, setSessionStartTs] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);
  const wasInRegRef = useRef(false);

  // Start geofencing + watch position
  useEffect(() => {
    let watchSub;

    (async () => {
      // Dev override: simulate being in the Reg
      if (DEV_FORCE_IN_REG) {
        wasInRegRef.current = true;
        const ts = await startSession();
        setSessionStartTs(ts);
        return;
      }

      // Start OS-level geofencing (for background detection)
      const isRegistered = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME).catch(() => false);
      if (!isRegistered) {
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
          { ...REG_CENTER, radius: REG_RADIUS },
        ]);
      }

      // Check for active session from a previous app launch
      const storedTs = await SecureStore.getItemAsync('session_start_ts');
      if (storedTs) {
        setSessionStartTs(storedTs);
        wasInRegRef.current = true;
      }

      // Watch foreground location
      watchSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (loc) => {
          const { latitude, longitude } = loc.coords;
          setUserLocation({ latitude, longitude });

          const inside = pointInPolygon({ latitude, longitude }, REG_POLYGON);
          setIsInReg(inside);

          // Entered the polygon
          if (inside && !wasInRegRef.current) {
            wasInRegRef.current = true;
            const ts = await startSession();
            setSessionStartTs(ts);
          }

          // Left the polygon
          if (!inside && wasInRegRef.current) {
            wasInRegRef.current = false;
            await endSession();
            setSessionStartTs(null);
          }
        }
      );
    })();

    return () => {
      if (watchSub) watchSub.remove();
    };
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (sessionStartTs) {
      const tick = () => {
        setElapsedSeconds(Math.floor((Date.now() - Date.parse(sessionStartTs)) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionStartTs]);

  // Dev-only toggle for Admin screen
  const devToggle = async () => {
    if (isInReg) {
      // Leave the Reg
      setIsInReg(false);
      wasInRegRef.current = false;
      await endSession();
      setSessionStartTs(null);
    } else {
      // Enter the Reg
      setIsInReg(true);
      setUserLocation({ latitude: 41.79207, longitude: -87.60028 });
      wasInRegRef.current = true;
      const ts = await startSession();
      setSessionStartTs(ts);
    }
  };

  return { userLocation, isInReg, sessionStartTs, elapsedSeconds, devToggle };
}
