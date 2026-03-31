import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';

const CARDS = [
  {
    bgColors: ['#FF7043', '#FF5252'],
    title: 'GRIND',
    desc: 'IS TRACKED',
    image: null,
  },
  {
    bgColors: ['#42A5F5', '#64B5F6'],
    title: 'FRIENDS',
    desc: 'SHARE THEIR GRIND',
    image: null,
  },
  {
    bgColors: ['#1E1238', '#2C2048'],
    title: null,
    desc: 'TEASE FRIENDS,\nEARN REWARDS,\nBE THE BIGGEST RAT!',
    descStyle: { fontSize: 21 },
    image: null,
  },
];

export default function Features({ navigation }) {
  return (
    <LinearGradient colors={['#E8F4FD', '#FFF5F8']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerWrap}>
          <Text style={styles.header}>How Reggy works</Text>
        </View>
        <View style={styles.cards}>
            {CARDS.map((card, i) => (
              <LinearGradient
                key={i}
                colors={card.bgColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={styles.cardImageSlot}>
                  {card.image ? (
                    <Image source={card.image} style={styles.cardImage} />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Text style={styles.placeholderText}>img</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardText}>
                  {card.title && <Text style={styles.cardTitle}>{card.title}</Text>}
                  <Text style={[styles.cardDesc, card.descStyle]}>{card.desc}</Text>
                </View>
              </LinearGradient>
            ))}
          </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('Location')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnLabel}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    ...LAYOUT.titleContainer,
  },
  header: {
    fontFamily: FONTS.ghibli,
    fontSize: 35,
    color: COLORS.dark,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  cards: {
    gap: 16,
    width: '90%',
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 14,
    height: 130,
  },
  cardImageSlot: {
    width: 90,
    height: 130,
    marginVertical: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
  },
  cardImagePlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.ghibli,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  cardText: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 45,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardDesc: {
    fontFamily: FONTS.ghibli,
    fontSize: 23,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 30,
    textAlign: 'center',
  },
  bottom: {
    ...LAYOUT.bottomContainer,
  },
  continueBtn: {
    ...LAYOUT.actionBtn,
  },
  continueBtnLabel: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: COLORS.dark,
    letterSpacing: 0.2,
  },
});
