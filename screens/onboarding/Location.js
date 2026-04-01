import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Linking, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';

export default function LocationScreen({ navigation }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'granted' | 'needsAlways'

  // Re-check permissions when user comes back from Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && status === 'needsAlways') {
        const bg = await Location.getBackgroundPermissionsAsync();
        if (bg.status === 'granted') {
          setStatus('granted');
          setTimeout(() => navigation.navigate('Photo'), 800);
        }
      }
    });
    return () => sub.remove();
  }, [status]);

  const handleAllow = async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setStatus('needsAlways');
      return;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus === 'granted') {
      setStatus('granted');
      setTimeout(() => navigation.navigate('Photo'), 800);
    } else {
      setStatus('needsAlways');
    }
  };

  // ── "Needs Always" fallback ──────────────────────────────────────────────
  if (status === 'needsAlways') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.stepsArea}>
            <Text style={styles.emoji}>📍</Text>
            <Text style={styles.subtitle}>One more thing</Text>
            <Text style={styles.body}>
              Reggy needs location set to{' '}
              <Text style={styles.bold}>"Always"</Text>
              {' '}to work.{'\n\n'}
              Open Settings → Location → select{' '}
              <Text style={styles.bold}>Always</Text>.
            </Text>
          </View>

          <View style={styles.bottom}>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnLabel}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── "Granted" brief flash ────────────────────────────────────────────────
  if (status === 'granted') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.stepsArea}>
            <Text style={styles.emoji}>✓</Text>
            <Text style={styles.subtitle}>You're all set</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.stepsArea}>
          <View style={styles.card}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepInstruction}>Tap</Text>
              <View style={styles.iosBadge}>
                <Text style={styles.iosBadgeText}>Allow While Using App</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepInstruction}>Tap</Text>
              <View style={styles.iosBadge}>
                <Text style={styles.iosBadgeText}>Change to Always Allow</Text>
              </View>
            </View>
          </View>

          <Text style={styles.warning}>Otherwise Reggy won't work!</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleAllow}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnLabel}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.blue },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: '20%',
  },
  stepsArea: {
    alignItems: 'center',
    gap: 16,
    width: '90%',
  },
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stepInstruction: {
    fontFamily: FONTS.ghibli,
    fontSize: 16,
    color: COLORS.brown,
  },
  iosBadge: {
    backgroundColor: COLORS.brown,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  iosBadgeText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  warning: {
    fontFamily: FONTS.ghibli,
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 34,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 44,
  },
  body: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  bold: {
    fontWeight: '700',
    opacity: 1,
  },
  bottom: {
    ...LAYOUT.bottomContainer,
  },
  continueBtn: {
    ...LAYOUT.actionBtn,
    backgroundColor: '#fff',
  },
  continueBtnLabel: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: COLORS.brown,
  },
});
