import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Linking, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';

function StepBadge({ number, label, highlight }) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepNumber, highlight && styles.stepNumberHighlight]}>
        <Text style={[styles.stepNumberText, highlight && styles.stepNumberTextHighlight]}>
          {number}
        </Text>
      </View>
      <Text style={styles.stepInstruction}>Tap</Text>
      <View style={styles.iosBadge}>
        <Text style={styles.iosBadgeText}>{label}</Text>
      </View>
    </View>
  );
}

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
      <LinearGradient colors={['#FFE8E8', '#FFF5F5', '#FFE8E8']} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centerContent}>
            <Text style={styles.emoji}>📍</Text>
            <Text style={styles.title}>One more thing</Text>
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
              style={styles.actionBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnLabel}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── "Granted" brief flash ────────────────────────────────────────────────
  if (status === 'granted') {
    return (
      <LinearGradient colors={['#D4FFE8', '#E8FFF0', '#D4FFE8']} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centerContent}>
            <Text style={styles.emoji}>✓</Text>
            <Text style={styles.title}>You're all set</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#D4FFE8', '#FFF5F8', '#D4E8FF']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Enable Location{'\n'}in 2 Steps</Text>
        </View>

        <View style={styles.stepsArea}>
          <StepBadge number="1" label="Allow While Using App" highlight />
          <StepBadge number="2" label="Change to Always Allow" highlight />

          <Text style={styles.warning}>Otherwise Reggy won't work!</Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleAllow}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnLabel}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
  },
  header: {
    ...LAYOUT.titleContainer,
  },
  stepsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  warning: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.dark,
    opacity: 0.55,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 34,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 44,
  },
  body: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.75,
  },
  bold: {
    fontWeight: '700',
    opacity: 1,
  },

  // Steps
  steps: {
    width: '100%',
    gap: 14,
    marginTop: 12,
  },
  stepsLabel: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.dark,
    opacity: 0.45,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30,18,56,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberHighlight: {
    backgroundColor: COLORS.dark,
  },
  stepNumberText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  stepNumberTextHighlight: {
    color: '#fff',
  },
  stepInstruction: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.dark,
    opacity: 0.6,
  },
  iosBadge: {
    backgroundColor: COLORS.dark,
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

  // Bottom
  bottom: {
    ...LAYOUT.bottomContainer,
  },
  actionBtn: {
    ...LAYOUT.actionBtn,
  },
  actionBtnLabel: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.dark,
    letterSpacing: 0.2,
  },
});
