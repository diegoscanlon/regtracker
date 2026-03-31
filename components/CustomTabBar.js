import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = 70;
const CURVE = 20;

const TAB_ICONS = {
  Profile: '👤',
  Leaderboard: '🏆',
  Friends: '👥',
  Admin: '⚙️',
};

function TabBarBackground() {
  // Curved top edge — a smooth wave across the full width
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
    </Svg>
  );
}

export default function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.wrapper}>
      <TabBarBackground />
      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name] || '•';

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
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, isFocused && styles.iconCircleActive]}>
                <Text style={styles.icon}>{icon}</Text>
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {route.name}
              </Text>
            </TouchableOpacity>
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
    paddingTop: CURVE + 4,
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
  iconCircleActive: {
    backgroundColor: 'rgba(71,53,54,0.1)',
  },
  icon: {
    fontSize: 22,
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
