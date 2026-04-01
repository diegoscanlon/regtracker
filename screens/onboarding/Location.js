import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Pressable, Linking, AppState, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, FONTS } from '../../constants/theme';

export default function LocationScreen({ navigation }) {
  // 'idle' | 'active' | 'complete' | 'failed'
  const [stepStates, setStepStates] = useState(['active', 'idle', 'idle']);
  const [stepLabels, setStepLabels] = useState([
    'Enable Location',
    'Allow While Using App',
    'Change to Always Allow',
  ]);
  const [allDone, setAllDone] = useState(false);

  // Shake animation for the active card
  const cardShake = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(cardShake, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (allDone) return;
    const timerId = setInterval(shake, 2500);
    shake();
    return () => clearInterval(timerId);
  }, [allDone, shake]);

  // Re-check permissions when user comes back from Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;

      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();

      if (fg.status === 'granted' && bg.status === 'granted') {
        setStepStates(['complete', 'complete', 'complete']);
        setAllDone(true);
        setTimeout(() => navigation.navigate('Photo'), 800);
      } else if (fg.status === 'granted') {
        setStepStates(['complete', 'complete', 'active']);
        setStepLabels(prev => {
          const next = [...prev];
          next[2] = 'Always Allow in Settings';
          return next;
        });
      }
    });
    return () => sub.remove();
  }, []);

  const handleCardPress = async (index) => {
    const state = stepStates[index];
    if (state === 'complete' || state === 'idle') return;

    // Card 1: start the permission flow
    if (index === 0 && state === 'active') {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

      if (fgStatus !== 'granted') {
        // Failed — update card 1 to guide them
        setStepStates(['failed', 'idle', 'idle']);
        setStepLabels(prev => {
          const next = [...prev];
          next[0] = 'Allow Location in Settings';
          return next;
        });
        return;
      }

      // Foreground granted — cards 1+2 complete, request background
      setStepStates(['complete', 'complete', 'active']);

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        setStepStates(['complete', 'complete', 'complete']);
        setAllDone(true);
        setTimeout(() => navigation.navigate('Photo'), 800);
      } else {
        // Need to go to settings for "Always"
        setStepStates(['complete', 'complete', 'active']);
        setStepLabels(prev => {
          const next = [...prev];
          next[2] = 'Always Allow in Settings';
          return next;
        });
      }
      return;
    }

    // Card 1 failed — open settings
    if (index === 0 && state === 'failed') {
      Linking.openSettings();
      return;
    }

    // Card 3: open settings
    if (index === 2 && state === 'active') {
      Linking.openSettings();
      return;
    }
  };

  const getCardStyle = (index) => {
    const state = stepStates[index];
    if (state === 'complete') return styles.cardComplete;
    if (state === 'failed') return styles.cardFailed;
    if (state === 'active') return styles.cardActive;
    return styles.cardIdle;
  };

  const isOnColor = (index) => {
    const s = stepStates[index];
    return s === 'complete' || s === 'failed';
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.stepsArea}>
          <Text style={styles.title}>Make Reggy Work!</Text>

          {stepLabels.map((label, i) => {
            const active = stepStates[i] === 'active';
            const failed = stepStates[i] === 'failed';
            const tappable = active || failed;

            return (
              <Pressable key={i} onPress={() => handleCardPress(i)} disabled={!tappable}>
                <Animated.View style={[
                  styles.card,
                  getCardStyle(i),
                  (active || failed) && { transform: [{ translateX: cardShake }] },
                ]}>
                  <View style={styles.cardInner}>
                    <Text style={[styles.stepNum, isOnColor(i) && styles.textOnColor]}>
                      {stepStates[i] === 'complete' ? '✓' : `${i + 1}`}
                    </Text>
                    <View style={styles.stepTextGroup}>
                      <Text style={[styles.stepTap, isOnColor(i) && styles.textOnColor]}>
                        {stepStates[i] === 'complete' ? 'Done' : 'Tap'}
                      </Text>
                      <Text style={[styles.stepLabel, isOnColor(i) && styles.textOnColor]}>
                        {label}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </Pressable>
            );
          })}
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
  },
  stepsArea: {
    gap: 16,
    width: '90%',
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 34,
    color: '#fff',
    alignSelf: 'center',
    marginBottom: 4,
  },

  // Cards
  card: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: COLORS.green,
  },
  cardComplete: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  cardFailed: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  cardIdle: {},
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // Number
  stepNum: {
    fontFamily: FONTS.ghibli,
    fontSize: 44,
    fontWeight: '700',
    color: COLORS.brown,
    marginTop: 4,
  },

  // Text group
  stepTextGroup: {
    flex: 1,
    gap: 2,
  },
  stepTap: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: COLORS.brown,
    opacity: 0.7,
  },
  stepLabel: {
    fontFamily: FONTS.ghibli,
    fontSize: 20,
    color: COLORS.brown,
  },
  textOnColor: {
    color: '#fff',
    opacity: 1,
  },
});
