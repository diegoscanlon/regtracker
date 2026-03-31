import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, SafeAreaView, Alert,
  TouchableOpacity, Animated, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const APP_SCHEME = 'regtracker';

function generateReferralCode() {
  // 8-char hex code
  const bytes = Crypto.getRandomBytes(4);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Invite({ navigation }) {
  // Each slot: { name, phone, referralCode } or null
  const [friends, setFriends] = useState([null, null, null]);
  const [hasContactsPermission, setHasContactsPermission] = useState(null);
  const [pendingSMSIndex, setPendingSMSIndex] = useState(null);
  const appState = useRef(AppState.currentState);

  // When user returns from SMS app, mark the invite as sent
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        pendingSMSIndex !== null
      ) {
        // User came back from SMS — count the invite as sent
        setPendingSMSIndex(null);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [pendingSMSIndex]);

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
    if (friends[index]) return; // already filled

    const granted = await ensureContactsPermission();
    if (!granted) return;

    // Open native contact picker
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return; // user cancelled

    // Get the first phone number
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

    // Check if this phone is already invited
    const alreadyInvited = friends.some((f) => f && f.phone === phone);
    if (alreadyInvited) {
      Alert.alert('Already Invited', `You've already invited ${name}!`);
      return;
    }

    // Generate referral code and record the invite
    const referralCode = generateReferralCode();
    const deepLink = `${APP_SCHEME}://invite?ref=${referralCode}`;
    const message = `see who grinds harder 💪\n${deepLink}`;

    // Save invite to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('invites').insert({
        inviter_id: user.id,
        referral_code: referralCode,
        invitee_phone: phone,
        invitee_name: name,
      });
    }

    // Check if SMS is available
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS Not Available', 'SMS is not available on this device.');
      return;
    }

    // Track that we're about to open SMS
    setPendingSMSIndex(index);

    // Open iMessage / SMS composer
    const { result } = await SMS.sendSMSAsync([phone], message);

    // Update the slot
    if (result === 'sent' || result === 'unknown') {
      // iOS returns 'unknown' when the SMS composer is dismissed
      // (it doesn't reliably report 'sent'), so we count both
      const updated = [...friends];
      updated[index] = { name, phone, referralCode };
      setFriends(updated);
    }
    setPendingSMSIndex(null);
  };

  const inviteCount = friends.filter(Boolean).length;
  const allInvited = inviteCount === 3;

  const handleFinish = async () => {
    await SecureStore.setItemAsync('onboarding_complete', 'true');
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <LinearGradient colors={['#D4E8FF', '#FFF5F8', '#E8D4FF']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Invite 3 Friends</Text>
          <Text style={styles.subtitle}>Social media doesn't work without friends!</Text>
        </View>

        {/* Pyramid of circles */}
        <View style={styles.pyramid}>
          {/* Top row — 1 circle */}
          <View style={styles.row}>
            <SlotCircle
              filled={friends[0]}
              onPress={() => handleSlotPress(0)}
            />
          </View>
          {/* Bottom row — 2 circles */}
          <View style={styles.row}>
            <SlotCircle
              filled={friends[1]}
              onPress={() => handleSlotPress(1)}
            />
            <View style={{ width: 24 }} />
            <SlotCircle
              filled={friends[2]}
              onPress={() => handleSlotPress(2)}
            />
          </View>
        </View>

        {/* Bottom actions */}
        <View style={styles.bottom}>
          {allInvited && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnLabel}>Continue</Text>
            </TouchableOpacity>
          )}
          <Pressable onPress={handleFinish} style={styles.skipBtn}>
            <Text style={styles.skipText}>skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SlotCircle({ filled, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.circleOuter, { transform: [{ scale }] }]}>
        <View style={styles.circleShadow} />
        <View style={[styles.circle, filled && styles.circleFilled]}>
          {filled ? (
            <Text style={styles.circleInitial}>{filled.name.charAt(0).toUpperCase()}</Text>
          ) : (
            <Text style={styles.circlePlus}>+</Text>
          )}
        </View>
      </Animated.View>
      {filled && <Text style={styles.circleName} numberOfLines={1}>{filled.name}</Text>}
    </Pressable>
  );
}

const CIRCLE_SIZE = 150;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headerWrap: {
    ...LAYOUT.titleContainer,
    gap: 10,
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 35,
    color: COLORS.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.avant,
    fontSize: 20,
    color: COLORS.muted,
    textAlign: 'center',
  },
  pyramid: {
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleOuter: {
    width: CIRCLE_SIZE + 5,
    height: CIRCLE_SIZE + 5,
  },
  circleShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: COLORS.dark,
  },
  circle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: COLORS.dark,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    backgroundColor: COLORS.mint,
  },
  circlePlus: {
    fontFamily: FONTS.ghibli,
    fontSize: 36,
    color: COLORS.muted,
    marginTop: -2,
  },
  circleInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 32,
    color: COLORS.dark,
  },
  circleName: {
    fontFamily: FONTS.avant,
    fontSize: 12,
    color: COLORS.dark,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: CIRCLE_SIZE,
  },
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
  skipBtn: { padding: 8 },
  skipText: {
    fontSize: 12,
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
});
