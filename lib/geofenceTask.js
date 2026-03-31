import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { GeofencingEventType } from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { GEOFENCE_TASK_NAME, REG_POLYGON } from '../constants/geofence';
import pointInPolygon from './pointInPolygon';

async function getCurrentLocation() {
  try {
    const loc = await Location.getLastKnownPositionAsync();
    if (loc) return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch {}
  return null;
}

async function startSession() {
  const now = new Date().toISOString();
  await SecureStore.setItemAsync('session_start_ts', now);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from('location_sessions')
      .insert({ user_id: user.id, started_at: now })
      .select('id')
      .single();
    if (data) {
      await SecureStore.setItemAsync('active_session_id', data.id);
    }
  }
}

async function endSession() {
  const sessionId = await SecureStore.getItemAsync('active_session_id');
  if (sessionId) {
    await supabase
      .from('location_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }
  await SecureStore.deleteItemAsync('session_start_ts');
  await SecureStore.deleteItemAsync('active_session_id');
}

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType }, error }) => {
  if (error) return;

  try {
    const activeSession = await SecureStore.getItemAsync('session_start_ts');
    const loc = await getCurrentLocation();

    if (eventType === GeofencingEventType.Enter) {
      // Circle triggered — verify with polygon
      if (loc && pointInPolygon(loc, REG_POLYGON)) {
        if (!activeSession) await startSession();
      }
    } else if (eventType === GeofencingEventType.Exit) {
      // Left the circle — definitely outside the polygon too
      if (activeSession) await endSession();
    }
  } catch (err) {
    console.error('[GeofenceTask]', err);
  }
});
