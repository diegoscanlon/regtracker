import React, { useState } from 'react';
import {
  View, Text, StyleSheet,
  SafeAreaView, TouchableOpacity, Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

function GrainOverlay({ opacity = 0.15 }) {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <Defs>
        <Filter id="grain" x="0%" y="0%" width="100%" height="100%">
          <FeTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <FeColorMatrix type="saturate" values="0" />
        </Filter>
      </Defs>
      <Rect width={width} height={height} filter="url(#grain)" opacity={opacity} />
    </Svg>
  );
}
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path, Defs, Filter, FeTurbulence, FeColorMatrix, Rect } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';
import GargoyleLoader from '../../components/GargoyleLoader';

WebBrowser.maybeCompleteAuthSession();

function GoogleLogo({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917" />
      <Path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691" />
      <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44" />
      <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917" />
    </Svg>
  );
}

export default function Welcome({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const player = useVideoPlayer(require('../../assets/bg.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      const redirectTo = Linking.createURL('auth-callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { hd: 'uchicago.edu', prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const fragment = result.url.split('#')[1] || '';
        const params = Object.fromEntries(new URLSearchParams(fragment));

        if (params.access_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;

          const { data: { user } } = await supabase.auth.getUser();

          if (!user?.email?.endsWith('@uchicago.edu')) {
            await supabase.auth.signOut();
            setError('UChicago accounts only');
            return;
          }

          navigation.navigate('Features');
        } else {
          setError('Sign in was cancelled');
        }
      }
    } catch (err) {
      setError('Sign in failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <GrainOverlay />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>REGGY</Text>
        </View>

        <View style={styles.bottom}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleGoogleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            <GoogleLogo size={22} />
            <Text style={styles.signInLabel}>
              {loading ? 'Signing in...' : 'Sign in with UChicago'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.legalLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 16,
  },
  header: {
    height: height * 0.4,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 94,
    color: '#fff',
    letterSpacing: 2,
  },
  bottom: {
    ...LAYOUT.bottomContainer,
  },
  signInBtn: {
    ...LAYOUT.actionBtn,
    overflow: 'hidden',
  },
  iconSlot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLabel: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: '#1E1238',
    letterSpacing: 0.2,
  },
  legal: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: 'rgba(0,0,0,0.45)',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: '#1A7FD4',
  },
  error: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: '#FFD6D6',
    textAlign: 'center',
  },
});
