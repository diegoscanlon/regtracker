import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, Alert,
  TouchableOpacity, Animated, AppState, Image,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const APP_SCHEME = 'regtracker';
const CIRCLE_SIZE = 100;

function generateReferralCode() {
  const bytes = Crypto.getRandomBytes(4);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function SlotCircle({ filled, onPress, delay, shakeAnim }) {
  const scale = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entranceAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
      delay,
    }).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, friction: 8, tension: 150 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{
      opacity: entranceAnim,
      transform: [
        { scale: Animated.multiply(scale, entranceAnim) },
        { translateX: shakeAnim },
      ],
    }}>
      <Pressable onPress={handlePress} style={styles.slotWrap}>
        <View style={[styles.circle, filled && styles.circleFilled]}>
          {filled ? (
            <Text style={styles.circleInitial}>{filled.name.charAt(0).toUpperCase()}</Text>
          ) : (
            <Text style={styles.circlePlus}>+</Text>
          )}
        </View>
        <Text style={[styles.circleName, filled && styles.circleNameFilled]} numberOfLines={1}>
          {filled ? filled.name : 'Tap to invite'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Invite({ navigation }) {
  const [friends, setFriends] = useState([null, null, null]);
  const [hasContactsPermission, setHasContactsPermission] = useState(null);
  const [pendingSMSIndex, setPendingSMSIndex] = useState(null);
  const appState = useRef(AppState.currentState);
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const [btnRevealed, setBtnRevealed] = useState(false);
  const shakes = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const shakeCircle = useCallback((index) => {
    const v = shakes[index];
    Animated.sequence([
      Animated.timing(v, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let cardIndex = 0;
    const tick = () => {
      shakeCircle(cardIndex);
      cardIndex++;
      if (cardIndex < 3) {
        timerId = setTimeout(tick, 450);
      } else {
        cardIndex = 0;
        timerId = setTimeout(tick, 3000);
      }
    };
    let timerId = setTimeout(tick, 1500);
    return () => clearTimeout(timerId);
  }, [shakeCircle]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        pendingSMSIndex !== null
      ) {
        setPendingSMSIndex(null);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [pendingSMSIndex]);

  const inviteCount = friends.filter(Boolean).length;
  const allInvited = inviteCount === 3;

  useEffect(() => {
    if (allInvited && !btnRevealed) {
      setBtnRevealed(true);
      Animated.spring(btnAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();
    }
  }, [allInvited, btnRevealed]);

  const ensureContactsPermission = async () => {
    if (hasContactsPermission) return true;
    const { status } = await Contacts.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasContactsPermission(granted);
    if (!granted) {
      Alert.alert(
        'Contacts Access Needed',
        'Enable contacts access in Settings to invite friends.',
      );
    }
    return granted;
  };

  const handleSlotPress = async (index) => {
    if (friends[index]) return;

    const granted = await ensureContactsPermission();
    if (!granted) return;

    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return;

    const phone =
      contact.phoneNumbers && contact.phoneNumbers.length > 0
        ? contact.phoneNumbers[0].number
        : null;

    if (!phone) {
      Alert.alert('No Phone Number', "This contact doesn't have a phone number.");
      return;
    }

    const name =
      contact.name ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      'Friend';

    const alreadyInvited = friends.some((f) => f && f.phone === phone);
    if (alreadyInvited) {
      Alert.alert('Already Invited', `You've already invited ${name}!`);
      return;
    }

    const referralCode = generateReferralCode();
    const deepLink = `${APP_SCHEME}://invite?ref=${referralCode}`;
    const message = `see who grinds harder\n${deepLink}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('invites').insert({
        inviter_id: user.id,
        referral_code: referralCode,
        invitee_phone: phone,
        invitee_name: name,
      });
    }

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS Not Available', 'SMS is not available on this device.');
      return;
    }

    setPendingSMSIndex(index);
    const { result } = await SMS.sendSMSAsync([phone], message);

    if (result === 'sent' || result === 'unknown') {
      const updated = [...friends];
      updated[index] = { name, phone, referralCode };
      setFriends(updated);
    }
    setPendingSMSIndex(null);
  };

  const handleFinish = async () => {
    Animated.spring(btnScale, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start(async () => {
      await SecureStore.setItemAsync('onboarding_complete', 'true');
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerGroup}>
          <Text style={styles.title}>Invite Friends</Text>
          <Text style={styles.subtitle}>Reggy only works with friends</Text>

          {/* Pyramid */}
          <View style={styles.pyramid}>
            <View style={styles.row}>
              <SlotCircle filled={friends[0]} onPress={() => handleSlotPress(0)} delay={0} shakeAnim={shakes[0]} />
            </View>
            <View style={styles.row}>
              <SlotCircle filled={friends[1]} onPress={() => handleSlotPress(1)} delay={200} shakeAnim={shakes[1]} />
              <SlotCircle filled={friends[2]} onPress={() => handleSlotPress(2)} delay={400} shakeAnim={shakes[2]} />
            </View>
          </View>

          <Text style={styles.counter}>{inviteCount}/3 invited</Text>
        </View>

        {/* Bottom */}
        <View style={styles.bottom}>
          {allInvited && (
            <Animated.View style={{
              opacity: btnAnim,
              transform: [{ scale: btnScale }, {
                translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
              }],
            }}>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={handleFinish}
                activeOpacity={1}
              >
                <Text style={styles.continueBtnLabel}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          <Pressable onPress={handleFinish} hitSlop={12}>
            <Text style={styles.skipText}>skip for now</Text>
          </Pressable>
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
    alignItems: 'center',
  },
  centerGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 38,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 4,
  },

  // Pyramid
  pyramid: {
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  slotWrap: {
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    backgroundColor: COLORS.green,
  },
  circlePlus: {
    fontFamily: FONTS.ghibli,
    fontSize: 32,
    color: COLORS.brown,
    opacity: 0.3,
  },
  circleInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 28,
    color: '#fff',
  },
  circleName: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    maxWidth: CIRCLE_SIZE,
  },
  circleNameFilled: {
    color: '#fff',
    opacity: 0.8,
  },

  // Counter
  counter: {
    fontFamily: FONTS.ghibli,
    fontSize: 24,
    color: '#fff',
    marginTop: 30,
  },

  // Bottom
  bottom: {
    ...LAYOUT.bottomContainer,
    gap: 16,
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
  skipText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },
});
