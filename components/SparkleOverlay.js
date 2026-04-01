import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

const SPARKLE_COUNT = 5;
const SPARKLE_SIZE = 8;
const DURATION = 500;

function Sparkle({ x, y, angle, onDone }) {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: true,
    }).start(onDone);
  }, []);

  const distance = 30 + Math.random() * 20;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: x - SPARKLE_SIZE / 2,
          top: y - SPARKLE_SIZE / 2,
          opacity: anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 1, 0],
          }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
            { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.2, 0] }) },
          ],
        },
      ]}
    />
  );
}

export default function SparkleOverlay({ children }) {
  const [sparkles, setSparkles] = useState([]);
  const idRef = useRef(0);

  const handleTouch = useCallback((e) => {
    const { pageX, pageY } = e.nativeEvent;
    const newSparkles = [];
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const angle = baseAngle + (i / SPARKLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      newSparkles.push({
        id: idRef.current++,
        x: pageX,
        y: pageY,
        angle,
      });
    }

    setSparkles((prev) => [...prev, ...newSparkles]);
  }, []);

  const removeSparkle = useCallback((id) => {
    setSparkles((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <View
      style={styles.container}
      onStartShouldSetResponderCapture={() => {
        // Return false so we don't steal the touch — children still get it
        return false;
      }}
      onMoveShouldSetResponderCapture={() => false}
      onTouchStart={handleTouch}
    >
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {sparkles.map((s) => (
          <Sparkle key={s.id} x={s.x} y={s.y} angle={s.angle} onDone={() => removeSparkle(s.id)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sparkle: {
    position: 'absolute',
    width: SPARKLE_SIZE,
    height: SPARKLE_SIZE,
    borderRadius: SPARKLE_SIZE / 2,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
