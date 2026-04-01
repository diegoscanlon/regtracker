import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { FONTS } from './constants/theme';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './lib/supabase';
import { GeofenceProvider } from './lib/GeofenceContext';
import SparkleOverlay from './components/SparkleOverlay';

import Welcome from './screens/onboarding/Welcome';
import Features from './screens/onboarding/Features';
import Location from './screens/onboarding/Location';
import Photo from './screens/onboarding/Photo';
import Invite from './screens/onboarding/Invite';
import Home from './screens/Home';

const Stack = createNativeStackNavigator();

// Apply JetBrains Mono as the default font for all Text components
// (pixel font is applied explicitly on titles/headings)
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.style = { fontFamily: FONTS.mono };

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [onboardingDone, setOnboardingDone] = useState(false);

  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    AvantGarde: require('./assets/fonts/itc-avant-garde-gothic-medium.otf'),
    Ghibli: require('./assets/fonts/Eyad Al-Samman - Ghibli.otf'),
    GhibliBold: require('./assets/fonts/Eyad Al-Samman - Ghibli-Bold.otf'),
    MochiBoom: require('./assets/fonts/Mochi Boom.ttf'),
    MochiBoomExtrude: require('./assets/fonts/Mochi Boom Extrude.ttf'),
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      const done = await SecureStore.getItemAsync('onboarding_complete');
      setSession(s);
      setOnboardingDone(done === 'true');
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still loading
  if (session === undefined || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#FFF5F8' }} />;

  const showHome = session && onboardingDone;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SparkleOverlay>
      <GeofenceProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {showHome ? (
            <Stack.Screen name="Home" component={Home} />
          ) : (
            <>
              <Stack.Screen name="Welcome" component={Welcome} />
              <Stack.Screen name="Features" component={Features} />
              <Stack.Screen name="Location" component={Location} />
              <Stack.Screen name="Photo" component={Photo} />
              <Stack.Screen name="Invite" component={Invite} />
              <Stack.Screen name="Home" component={Home} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      </GeofenceProvider>
      </SparkleOverlay>
    </GestureHandlerRootView>
  );
}
