import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polygon, Circle } from 'react-native-maps';
import useGeofence from '../lib/useGeofence';
import { COLORS, FONTS } from '../constants/theme';
import { REG_CENTER, REG_RADIUS, REG_POLYGON } from '../constants/geofence';

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function Admin() {
  const { userLocation, isInReg, elapsedSeconds } = useGeofence();

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

});
