import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Pressable, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import PixelButton from '../../components/PixelButton';
import { COLORS, FONTS } from '../../constants/theme';

export default function LocationScreen({ navigation }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'granted' | 'denied'

  // Gentle bouncing pin animation
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -12, duration: 500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleAllow = async () => {
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus === 'granted') {
      setStatus('granted');
      setTimeout(() => navigation.navigate('Photo'), 800);
    } else {
      setStatus('denied');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Photo');
  };

  return (
    <LinearGradient colors={['#D4FFE8', '#FFF5F8', '#D4E8FF']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Animated pin */}
        <View style={styles.pinArea}>
          <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <View style={styles.pinWrapper}>
              <View style={styles.pinShadow} />
              <View style={styles.pinBox}>
                <Text style={styles.pinEmoji}>📍</Text>
              </View>
            </View>
          </Animated.View>
          {/* Shadow dot on ground */}
          <View style={styles.pinGroundShadow} />
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={styles.title}>ALLOW{'\n'}LOCATION</Text>
          <Text style={styles.desc}>
            {status === 'denied'
              ? 'Location access was denied. You can enable it later in Settings.'
              : "We track which UChicago spots you're at and for how long — that's how you earn your rank."}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {status === 'granted' ? (
            <View style={styles.grantedBadge}>
              <Text style={styles.grantedText}>✓ location enabled!</Text>
            </View>
          ) : (
            <>
              <PixelButton
                label={status === 'denied' ? 'OPEN SETTINGS' : 'ALLOW LOCATION'}
                icon="📍"
                onPress={handleAllow}
                color={COLORS.mint}
              />
              <Pressable onPress={handleSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>not now</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  pinArea: {
    alignItems: 'center',
    gap: 12,
  },
  pinWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  pinShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 96,
    height: 96,
    backgroundColor: COLORS.dark,
  },
  pinBox: {
    width: 96,
    height: 96,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEmoji: { fontSize: 48 },
  pinGroundShadow: {
    width: 48,
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.dark,
    opacity: 0.15,
  },
  textArea: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 20,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 1,
  },
  desc: {
    fontSize: 14,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.65,
    maxWidth: 280,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 12,
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
  grantedBadge: {
    borderWidth: 2,
    borderColor: COLORS.dark,
    backgroundColor: COLORS.mint,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  grantedText: {
    fontFamily: FONTS.pixel,
    fontSize: 10,
    color: COLORS.dark,
    lineHeight: 18,
  },
});
