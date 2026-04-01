import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomTabBar from '../components/CustomTabBar';

import Stats from './Stats';
import FriendProfile from './FriendProfile';
import Leaderboard from './Leaderboard';
import Friends from './Friends';
import Admin from './Admin';

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();
const LeaderboardStack = createNativeStackNavigator();
const FriendsStack = createNativeStackNavigator();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="StatsMain" component={Stats} />
      <ProfileStack.Screen name="FriendProfile" component={FriendProfile} />
    </ProfileStack.Navigator>
  );
}

function LeaderboardStackScreen() {
  return (
    <LeaderboardStack.Navigator screenOptions={{ headerShown: false }}>
      <LeaderboardStack.Screen name="LeaderboardMain" component={Leaderboard} />
      <LeaderboardStack.Screen name="FriendProfile" component={FriendProfile} />
    </LeaderboardStack.Navigator>
  );
}

function FriendsStackScreen() {
  return (
    <FriendsStack.Navigator screenOptions={{ headerShown: false }}>
      <FriendsStack.Screen name="FriendsMain" component={Friends} />
      <FriendsStack.Screen name="FriendProfile" component={FriendProfile} />
    </FriendsStack.Navigator>
  );
}

export default function Home() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Activity"
    >
      <Tab.Screen name="Leaderboard" component={LeaderboardStackScreen} />
      <Tab.Screen name="Activity" component={FriendsStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
      <Tab.Screen name="Admin" component={Admin} />
    </Tab.Navigator>
  );
}
