import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polygon, Circle } from 'react-native-maps';
import * as SecureStore from 'expo-secure-store';
import { useGeofenceContext } from '../lib/GeofenceContext';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../constants/theme';
import { REG_CENTER, REG_RADIUS, REG_POLYGON } from '../constants/geofence';

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function Admin() {
  const { userLocation, isInReg, elapsedSeconds, devToggle } = useGeofenceContext();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'This will sign you out and reset onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('onboarding_complete');
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={['#FFF5F8', '#F0F8FF']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Admin</Text>

        {/* Status badge */}
        <View style={[styles.badge, isInReg ? styles.badgeIn : styles.badgeOut]}>
          <Text style={[styles.badgeText, isInReg && styles.badgeTextIn]}>
            {isInReg ? '📍 In the Reg' : 'Not in the Reg'}
          </Text>
        </View>

        {/* Timer */}
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        <Text style={styles.timerLabel}>
          {isInReg ? 'current session' : 'start grinding!'}
        </Text>

        {/* Dev toggle */}
        <Pressable style={[styles.toggleBtn, isInReg ? styles.toggleBtnActive : null]} onPress={devToggle}>
          <Text style={styles.toggleBtnText}>
            {isInReg ? 'Leave the Reg' : 'Enter the Reg'}
          </Text>
        </Pressable>

        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Map */}
        <View style={styles.mapWrapper}>
          <View style={styles.mapShadow} />
          <MapView
            style={styles.map}
            initialRegion={{
              ...REG_CENTER,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            <Polygon
              coordinates={REG_POLYGON}
              fillColor="rgba(255,107,168,0.2)"
              strokeColor={COLORS.primary}
              strokeWidth={2}
            />
            <Circle
              center={REG_CENTER}
              radius={REG_RADIUS}
              fillColor="rgba(126,200,227,0.1)"
              strokeColor="rgba(126,200,227,0.4)"
              strokeWidth={1}
            />
          </MapView>
        </View>
      </SafeAreaView>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 12,
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 28,
    alignSelf: 'flex-start',
    color: COLORS.dark,
    letterSpacing: 2,
  },

  // Status badge
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  badgeIn: {
    backgroundColor: COLORS.mint,
  },
  badgeOut: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  badgeText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.dark,
    letterSpacing: 0.3,
  },
  badgeTextIn: {
    fontWeight: '700',
  },

  // Timer
  timer: {
    fontFamily: FONTS.pixel,
    fontSize: 32,
    color: COLORS.dark,
    letterSpacing: 4,
    marginTop: 4,
  },
  timerLabel: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },

  // Map
  mapWrapper: {
    flex: 1,
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  mapShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.dark,
    borderRadius: 4,
  },
  map: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.dark,
    borderRadius: 4,
  },

  // Dev toggle button
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.dark,
    backgroundColor: '#fff',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  toggleBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '700',
  },
  signOutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
    backgroundColor: COLORS.error,
  },
  signOutText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
});
