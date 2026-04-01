import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Animated } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 70;
const CURVE = 20;

const TAB_ICONS = {
  Admin: '⚙️',
};

const TAB_IMAGES = {
  Profile: require('../assets/tab-stats.png'),
  Leaderboard: require('../assets/tab-leaderboard.png'),
  Friends: require('../assets/tab-friends.png'),
};

// Generate grass blades throughout the banner
// [x%, y offset from top curve, height, lean angle]
const GRASS_BLADES = [];
for (let i = 0; i < 60; i++) {
  const xPct = 0.01 + (i / 60) * 0.98 + (Math.sin(i * 7.3) * 0.008);
  const yOff = 5 + Math.abs(Math.sin(i * 3.7)) * 90; // spread throughout to bottom
  const bladeH = 8 + Math.abs(Math.sin(i * 5.1)) * 10;
  const lean = Math.sin(i * 2.3) * 14;
  GRASS_BLADES.push([xPct, yOff, bladeH, lean]);
}

function TabBarBackground() {
  const w = width;
  const h = TAB_HEIGHT + CURVE + 40;
  return (
    <Svg width={w} height={h} style={styles.bgSvg}>
      <Path
        d={`
          M 0 ${CURVE}
          Q ${w * 0.25} 0, ${w * 0.5} ${CURVE}
          Q ${w * 0.75} ${CURVE * 2}, ${w} ${CURVE}
          L ${w} ${h}
          L 0 ${h}
          Z
        `}
        fill={COLORS.green}
      />
      {/* Grass blades throughout */}
      <G>
        {GRASS_BLADES.map(([xPct, yOff, bladeH, lean], i) => {
          const x = w * xPct;
          const baseY = CURVE + yOff;
          // Skip blades that would poke above the curve top
          if (baseY - bladeH < CURVE - 5) return null;
          const tipX = x + lean * 0.3;
          const tipY = baseY - bladeH;
          const opacity = 0.25 + Math.abs(Math.sin(i * 4.2)) * 0.2;
          return (
            <Path
              key={i}
              d={`M ${x - 1} ${baseY} Q ${x} ${baseY - bladeH * 0.6}, ${tipX} ${tipY} Q ${x + 0.5} ${baseY - bladeH * 0.5}, ${x + 1} ${baseY} Z`}
              fill={i % 2 === 0 ? `rgba(240,220,120,${opacity})` : `rgba(255,240,150,${opacity})`}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function AnimatedTab({ route, isFocused, onPress }) {
  const anim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  }, [isFocused]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const icon = TAB_ICONS[route.name] || '•';
  const tabImage = TAB_IMAGES[route.name];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tab}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconCircle, { transform: [{ scale }] }]}>
        {tabImage ? (
          <Image source={tabImage} style={[styles.tabImage, route.name === 'Leaderboard' && styles.tabImageLeaderboard, route.name === 'Profile' && styles.tabImageProfile]} />
        ) : (
          <Text style={styles.icon}>{icon}</Text>
        )}
      </Animated.View>
      <Animated.Text style={[styles.label, isFocused && styles.labelActive, { transform: [{ scale }] }]}>
        {route.name}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.wrapper}>
      <TabBarBackground />
      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <AnimatedTab
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_HEIGHT + CURVE + 40,
    paddingBottom: 34,
  },
  bgSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: CURVE + 16,
    paddingHorizontal: 8,
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  icon: {
    fontSize: 35,
  },
  tabImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  tabImageLeaderboard: {
    width: 60,
    height: 60,
  },
  tabImageProfile: {
    width: 48,
    height: 48,
  },
  label: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: 'rgba(71,53,54,0.5)',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: COLORS.brown,
    fontWeight: '600',
  },
});
