import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image,
  SafeAreaView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';

// Placeholder avatars — replace `source` with actual images once uploaded
const AVATARS = [
  { id: 'phil', source: require('../../assets/avatars/phoenix.png'), name: 'Phil the Phoenix' },
  { id: 'gargoyle', source: require('../../assets/avatars/gargoyle.png'), name: 'Gate Gargoyle' },
  { id: 'goose', source: require('../../assets/avatars/goose.png'), name: 'Midway Goose' },
  { id: 'duck', source: require('../../assets/avatars/duck.png'), name: 'Duck Pond Duck' },
  { id: 'squirrel', source: require('../../assets/avatars/squirrel.png'), name: 'Quad Squirrel' },
  { id: 'db', source: require('../../assets/avatars/db.png'), name: 'Special DB' },
];

export default function Photo({ navigation }) {
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    navigation.navigate('Invite');
  };

  return (
    <LinearGradient colors={['#FFE8D4', '#FFF5F8', '#FFD4E8']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Title */}
        {/* Title + Grid together */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Reggy</Text>
          <View style={styles.grid}>
          {AVATARS.map((avatar) => {
            const isSelected = selected === avatar.id;
            return (
              <Pressable
                key={avatar.id}
                onPress={() => setSelected(avatar.id)}
                style={styles.avatarSlot}
              >
                <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                  {avatar.source ? (
                    <Image source={avatar.source} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                  )}
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          </View>

          {selected && (
            <Text style={styles.selectedName}>
              {AVATARS.find((a) => a.id === selected)?.name}
            </Text>
          )}
        </View>

        {/* Button — only shows when selected */}
        {selected && (
          <View style={styles.bottom}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnLabel}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
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
    gap: 24,
  },
  selectedName: {
    fontFamily: FONTS.ghibli,
    fontSize: 22,
    color: COLORS.dark,
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 35,
    color: COLORS.dark,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    rowGap: 16,
    paddingHorizontal: 0,
    width: '100%',
    marginTop: '10%',
  },
  avatarSlot: {
    position: 'relative',
    alignItems: 'center',
    width: '33%',
  },
  avatarCircle: {
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: 'rgba(30,18,56,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarCircleSelected: {
    borderColor: '#0066FF',
    borderWidth: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 42,
  },
  checkmark: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
});
