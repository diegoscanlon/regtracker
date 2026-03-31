import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Each row is a bitmask: 1 = filled pixel, 0 = transparent
const SHAPES = {
  small: [
    [0,1,1,0],
    [1,1,1,1],
    [1,1,1,1],
  ],
  medium: [
    [0,0,1,1,1,0,0],
    [0,1,1,1,1,1,0],
    [1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1],
  ],
  large: [
    [0,0,1,1,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  puff: [
    [0,1,1,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
  ],
};

// direction: 'ltr' | 'rtl'
// initialFraction: 0–1, where along the path the cloud starts (so screen is pre-populated)
const CLOUD_CONFIGS = [
  { key: 'a', shape: 'medium', y: 80,  px: 6, direction: 'ltr', speed: 14000, f: 0.1, opacity: 0.9  },
  { key: 'b', shape: 'small',  y: 170, px: 5, direction: 'rtl', speed: 19000, f: 0.6, opacity: 0.75 },
  { key: 'c', shape: 'large',  y: 45,  px: 5, direction: 'ltr', speed: 24000, f: 0.4, opacity: 0.55 },
  { key: 'd', shape: 'puff',   y: 260, px: 7, direction: 'rtl', speed: 11000, f: 0.2, opacity: 0.8  },
  { key: 'e', shape: 'medium', y: 330, px: 4, direction: 'ltr', speed: 21000, f: 0.75, opacity: 0.5 },
  { key: 'f', shape: 'small',  y: 140, px: 6, direction: 'rtl', speed: 17000, f: 0.85, opacity: 0.65},
  { key: 'g', shape: 'large',  y: 400, px: 4, direction: 'ltr', speed: 28000, f: 0.3, opacity: 0.4  },
  { key: 'h', shape: 'puff',   y: 210, px: 5, direction: 'ltr', speed: 15000, f: 0.5, opacity: 0.7  },
];

function CloudShape({ shape, px, opacity }) {
  return (
    <View style={{ opacity }}>
      {shape.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => (
            <View
              key={c}
              style={{
                width: px,
                height: px,
                backgroundColor: cell ? 'rgba(255,255,255,0.95)' : 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function AnimatedCloud({ config }) {
  const shape = SHAPES[config.shape];
  const cloudW = shape[0].length * config.px;
  const totalPath = W + cloudW;

  const startX = config.direction === 'ltr' ? -cloudW : W;
  const endX   = config.direction === 'ltr' ? W : -cloudW;

  // Place the cloud partway along its path so the screen looks populated from the start
  const initialX = config.direction === 'ltr'
    ? -cloudW + config.f * totalPath
    : W - config.f * totalPath;

  const xAnim = useRef(new Animated.Value(initialX)).current;

  useEffect(() => {
    const remainingFraction = 1 - config.f;

    // 1. Animate from initial position to the end of the path
    Animated.timing(xAnim, {
      toValue: endX,
      duration: config.speed * remainingFraction,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(() => {
      // 2. Reset to start and loop forever
      xAnim.setValue(startX);
      Animated.loop(
        Animated.timing(xAnim, {
          toValue: endX,
          duration: config.speed,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    });

    return () => xAnim.stopAnimation();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: config.y,
        transform: [{ translateX: xAnim }],
      }}
    >
      <CloudShape shape={shape} px={config.px} opacity={config.opacity} />
    </Animated.View>
  );
}

export default function PixelClouds() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {CLOUD_CONFIGS.map(cfg => (
        <AnimatedCloud key={cfg.key} config={cfg} />
      ))}
    </View>
  );
}
