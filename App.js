import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './lib/supabase';

import Welcome from './screens/onboarding/Welcome';
import Features from './screens/onboarding/Features';
import Location from './screens/onboarding/Location';
import Photo from './screens/onboarding/Photo';
import Invite from './screens/onboarding/Invite';
import Home from './screens/Home';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [onboardingDone, setOnboardingDone] = useState(false);

  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

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
    </GestureHandlerRootView>
  );
}
