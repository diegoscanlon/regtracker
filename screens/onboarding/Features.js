import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PixelButton from '../../components/PixelButton';
import { COLORS, FONTS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const CARDS = [
  {
    emoji: '⏰',
    bgColors: ['#FFD4E8', '#FFF5F8'],
    accent: COLORS.primary,
    title: 'TRACK YOUR\nTIME',
    desc: 'We log how long you hang at your favorite UChicago spots — Reg, Harper, Crerar, and more.',
  },
  {
    emoji: '🏆',
    bgColors: ['#D4E8FF', '#F5F8FF'],
    accent: '#5599FF',
    title: 'CLIMB THE\nRANKS',
    desc: 'Weekly leaderboards with your friends. Who really lives at the library?',
  },
  {
    emoji: '👑',
    bgColors: ['#E8D4FF', '#F8F5FF'],
    accent: '#9933FF',
    title: 'OWN YOUR\nSPOT',
    desc: 'Become the #1 regular at your favorite campus spots. The crown is yours to claim.',
  },
];

export default function Features({ navigation }) {
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleMomentumScrollEnd = (e) => {
    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const handleContinue = () => {
    if (currentIndex < CARDS.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      navigation.navigate('Location');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {CARDS.map((card, i) => (
          <View key={i} style={{ width }}>
            <LinearGradient colors={card.bgColors} style={styles.card}>
              <View style={styles.cardContent}>
                {/* Pixel icon box */}
                <View style={styles.iconWrapper}>
                  <View style={[styles.iconShadow, { backgroundColor: card.accent }]} />
                  <View style={[styles.iconBox, { borderColor: card.accent }]}>
                    <Text style={styles.cardEmoji}>{card.emoji}</Text>
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: card.accent }]}>{card.title}</Text>
                <Text style={styles.cardDesc}>{card.desc}</Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Footer: dots + button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {CARDS.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange, outputRange: [8, 20, 8], extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <PixelButton
          label={currentIndex === CARDS.length - 1 ? "LET'S GO  →" : 'NEXT  →'}
          onPress={handleContinue}
          color={COLORS.primary}
          textColor={COLORS.surface}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  card: {
    flex: 1,
    minHeight: Dimensions.get('window').height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 180,
  },
  cardContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 28,
  },
  iconWrapper: {
    position: 'relative',
    width: 104,
    height: 104,
  },
  iconShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 100,
    height: 100,
  },
  iconBox: {
    width: 100,
    height: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 48,
  },
  cardTitle: {
    fontFamily: FONTS.pixel,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 1,
  },
  cardDesc: {
    fontSize: 15,
    textAlign: 'center',
    color: COLORS.dark,
    lineHeight: 24,
    opacity: 0.65,
    maxWidth: 280,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 52,
    paddingTop: 20,
    gap: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    backgroundColor: COLORS.dark,
  },
});
