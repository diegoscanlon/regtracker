import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from '../components/CustomTabBar';

import Stats from './Stats';
import Leaderboard from './Leaderboard';
import Friends from './Friends';
import Admin from './Admin';

const Tab = createBottomTabNavigator();

export default function Home() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Profile" component={Stats} />
      <Tab.Screen name="Leaderboard" component={Leaderboard} />
      <Tab.Screen name="Friends" component={Friends} />
      <Tab.Screen name="Admin" component={Admin} />
    </Tab.Navigator>
  );
}
