import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Share, Pressable, SafeAreaView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import PixelButton from '../../components/PixelButton';
import { COLORS, FONTS } from '../../constants/theme';

const INVITE_LINK = 'https://regtracker.app/join'; // update when live

const SLOT_LABELS = ['friend #1', 'friend #2', 'friend #3'];

export default function Invite({ navigation }) {
  const [invited, setInvited] = useState([false, false, false]);

  const handleShare = async (index) => {
    try {
      const result = await Share.share({
        message: `join me on regtracker — track who really owns the reg 📍\n${INVITE_LINK}`,
        url: INVITE_LINK,
      });
      if (result.action === Share.sharedAction) {
        const updated = [...invited];
        updated[index] = true;
        setInvited(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinish = async () => {
    await SecureStore.setItemAsync('onboarding_complete', 'true');
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const inviteCount = invited.filter(Boolean).length;

  return (
    <LinearGradient colors={['#D4E8FF', '#FFF5F8', '#E8D4FF']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.decorChar}>★ ♡ ★</Text>
          <Text style={styles.title}>FIND YOUR{'\n'}CREW</Text>
          <Text style={styles.subtitle}>the leaderboard is better with friends</Text>
        </View>

        {/* Invite slots */}
        <View style={styles.slots}>
          {SLOT_LABELS.map((label, i) => (
            <Pressable key={i} onPress={() => handleShare(i)} style={styles.slotWrapper}>
              <View style={styles.slotShadow} />
              <View style={[styles.slot, invited[i] && styles.slotDone]}>
                <Text style={styles.slotEmoji}>{invited[i] ? '✓' : '+'}</Text>
                <Text style={[styles.slotLabel, invited[i] && styles.slotLabelDone]}>
                  {invited[i] ? 'invite sent!' : label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Progress hint */}
        {inviteCount > 0 ? (
          <Text style={styles.progressText}>
            {inviteCount === 3
              ? '✦ crew assembled! ✦'
              : `${inviteCount}/3 invited`}
          </Text>
        ) : (
          <Text style={styles.progressText}>tap a slot to invite a friend</Text>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <PixelButton
            label={inviteCount === 3 ? 'START EXPLORING  →' : `INVITE ALL  →`}
            icon="🎮"
            onPress={inviteCount === 3 ? handleFinish : () => handleShare(invited.indexOf(false))}
            color={inviteCount === 3 ? COLORS.accent : COLORS.lavender}
          />
          <Pressable onPress={handleFinish} style={styles.skipBtn}>
            <Text style={styles.skipText}>start without friends</Text>
          </Pressable>
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
    paddingVertical: 52,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    gap: 14,
  },
  decorChar: {
    fontSize: 18,
    color: COLORS.lavender,
    opacity: 0.8,
    letterSpacing: 8,
  },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 20,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  slots: {
    width: '100%',
    gap: 16,
  },
  slotWrapper: {
    position: 'relative',
    height: 64,
  },
  slotShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.dark,
  },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.dark,
  },
  slotDone: {
    backgroundColor: COLORS.mint,
  },
  slotEmoji: {
    fontSize: 20,
    color: COLORS.dark,
    fontFamily: FONTS.pixel,
  },
  slotLabel: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    color: COLORS.muted,
    lineHeight: 16,
  },
  slotLabelDone: {
    color: COLORS.dark,
  },
  progressText: {
    fontFamily: FONTS.pixel,
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  skipBtn: { padding: 8 },
  skipText: {
    fontSize: 12,
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
});
