import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';

// Placeholder — main app goes here
export default function Home() {
  return (
    <LinearGradient colors={['#FFF5F8', '#F0F8FF']} style={styles.container}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>REGTRACKER</Text>
      <Text style={styles.subtitle}>leaderboard coming soon...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emoji: { fontSize: 52 },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 16,
    color: COLORS.dark,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
});
