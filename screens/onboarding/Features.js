import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Animated, Pressable,
} from 'react-native';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';

const CARDS = [
  {
    title: 'GRIND',
    desc: 'IS TRACKED',
    image: require('../../assets/feature-card-1.png'),
  },
  {
    title: 'FRIENDS',
    desc: 'ALSO SHARE',
    image: require('../../assets/feature-card-2.png'),
  },
  {
    title: 'AGAINST',
    desc: 'ALL UCHICAGO',
    image: require('../../assets/feature-card-3.png'),
  },
];

const STAGGER_DELAY = 955;

export default function Features({ navigation }) {
  // Continue button press
  const btnScale = useRef(new Animated.Value(1)).current;

  // Card 1: pop in (scale)
  const card1Scale = useRef(new Animated.Value(0)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;

  // Card 2: slide from left
  const card2TranslateX = useRef(new Animated.Value(-300)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;

  // Card 3: slide up + fade
  const card3TranslateY = useRef(new Animated.Value(80)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;

  // Shake values for idle loop
  const shakes = useRef(CARDS.map(() => new Animated.Value(0))).current;

  // Tap scale for each card
  const tapScales = useRef(CARDS.map(() => new Animated.Value(1))).current;

  const handleCardTap = useCallback((index) => {
    Animated.sequence([
      Animated.spring(tapScales[index], {
        toValue: 0.92,
        useNativeDriver: true,
        friction: 8,
        tension: 150,
      }),
      Animated.spring(tapScales[index], {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }),
    ]).start();
  }, []);

  // Button
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const springConfig = { useNativeDriver: true, friction: 8, tension: 30 };

    // Card 1: pop in
    const card1Anim = Animated.parallel([
      Animated.spring(card1Scale, { toValue: 1, ...springConfig }),
      Animated.timing(card1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]);

    // Card 2: slide from left
    const card2Anim = Animated.parallel([
      Animated.spring(card2TranslateX, { toValue: 0, ...springConfig }),
      Animated.timing(card2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]);

    // Card 3: slide up
    const card3Anim = Animated.parallel([
      Animated.spring(card3TranslateY, { toValue: 0, ...springConfig }),
      Animated.timing(card3Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]);

    // Button fade in
    const buttonAnim = Animated.parallel([
      Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(buttonTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    Animated.stagger(STAGGER_DELAY, [
      card1Anim,
      card2Anim,
      card3Anim,
      buttonAnim,
    ]).start(() => setShowButton(true));
  }, []);

  const shakeCard = useCallback((index) => {
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
    if (!showButton) return;
    let cardIndex = 0;
    // First shake after 3s, then each subsequent card 450ms apart,
    // then 3s pause before restarting from card 0
    const tick = () => {
      shakeCard(cardIndex);
      cardIndex++;
      if (cardIndex < 3) {
        timerId = setTimeout(tick, 450);
      } else {
        cardIndex = 0;
        timerId = setTimeout(tick, 3000);
      }
    };
    let timerId = setTimeout(tick, 3000);
    return () => clearTimeout(timerId);
  }, [showButton, shakeCard]);

  const cardAnimStyles = [
    { opacity: card1Opacity, transform: [{ scale: card1Scale }, { translateX: shakes[0] }] },
    { opacity: card2Opacity, transform: [{ translateX: card2TranslateX }, { translateX: shakes[1] }] },
    { opacity: card3Opacity, transform: [{ translateY: card3TranslateY }, { translateX: shakes[2] }] },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.cards}>
            {CARDS.map((card, i) => {
              const textFirst = i === 0 || i === 2;
              const imageEl = (
                <View style={styles.cardImageSlot}>
                  <Image source={card.image} style={styles.cardImage} />
                </View>
              );
              const textEl = (
                <View style={styles.cardText}>
                  {card.title && <Text style={styles.cardTitle}>{card.title}</Text>}
                  <Text style={[styles.cardDesc, card.descStyle]}>{card.desc}</Text>
                </View>
              );
              return (
                <Pressable key={i} onPress={() => handleCardTap(i)}>
                  <Animated.View
                    style={[styles.card, cardAnimStyles[i], { transform: [...(cardAnimStyles[i].transform || []), { scale: tapScales[i] }] }]}
                  >
                    <View style={[styles.cardInner, i === 0 && { gap: 18 }]}>
                      {textFirst ? <>{textEl}{imageEl}</> : <>{imageEl}{textEl}</>}
                    </View>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

        <Animated.View style={[styles.bottom, { opacity: buttonOpacity, transform: [{ translateY: buttonTranslateY }] }]}>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => {
                Animated.spring(btnScale, {
                  toValue: 0.92,
                  useNativeDriver: true,
                  friction: 8,
                  tension: 100,
                }).start(() => navigation.navigate('Location'));
              }}
              activeOpacity={1}
              disabled={!showButton}
            >
              <Text style={styles.continueBtnLabel}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
  cards: {
    gap: 16,
    width: '90%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 16,
    height: 130,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImageSlot: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 125,
    height: 125,
    resizeMode: 'contain',
  },
  cardText: {
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  cardTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 45,
    color: COLORS.brown,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardDesc: {
    fontFamily: FONTS.ghibli,
    fontSize: 23,
    color: COLORS.brown,
    lineHeight: 30,
    textAlign: 'center',
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
