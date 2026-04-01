import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  Pressable, Image, Animated,
} from 'react-native';
import { supabase } from '../lib/supabase';
import GargoyleLoader from '../components/GargoyleLoader';
import { COLORS, FONTS } from '../constants/theme';


function formatHours(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0h';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function AnimatedTab({ label, active, onPress }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 80,
    }).start();
  }, [active]);

  const fontSize = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 18] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Pressable onPress={onPress}>
      <Animated.Text
        style={[
          styles.leaderboardTabText,
          { fontWeight: active ? '700' : '400', fontSize, opacity },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const PODIUM_COLORS = {
  1: '#FFD700',  // gold
  2: '#C0C0C0',  // silver
  3: '#CD7F32',  // bronze
};

function LeaderboardRow({ item, isMe, onPress }) {
  const name = item.display_name || item.email?.split('@')[0] || 'Anonymous';
  const isTop3 = item.rank <= 3;
  const podiumBg = PODIUM_COLORS[item.rank];
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (onPress) onPress();
    Animated.timing(scale, { toValue: 0.95, duration: 150, useNativeDriver: true }).start(() => {
      scale.setValue(1);
    });
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.card,
          isTop3 && { backgroundColor: podiumBg },
          isMe && !isTop3 && styles.cardMe,
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.rankCol}>
          {isTop3 ? (
            <Text style={styles.rankTop3}>{item.rank}</Text>
          ) : (
            <Text style={styles.rank}>{item.rank}</Text>
          )}
        </View>

        <View style={styles.nameCol}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, isTop3 && { backgroundColor: 'rgba(71,53,54,0.2)' }]}>
              <Text style={styles.avatarInitial}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.nameInfo}>
            <Text style={[styles.name, isTop3 && styles.nameTop3]} numberOfLines={1}>
              {name}{isMe ? ' (you)' : ''}
            </Text>
          </View>
        </View>

        <Text style={[styles.hours, isTop3 && styles.hoursTop3]}>
          {formatHours(item.total_seconds)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function Leaderboard({ navigation }) {
  const [activeTab, setActiveTab] = useState('all');
  const [timeRange, setTimeRange] = useState('week'); // 'week' | 'alltime'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);

    const params = {
      friends_only: activeTab === 'friends',
    };

    if (timeRange === 'week') {
      // Get start of current week (Monday)
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      params.since_date = monday.toISOString();
    } else {
      // All time — use a very old date
      params.since_date = '2020-01-01T00:00:00Z';
    }

    const { data: rows, error } = await supabase.rpc('get_leaderboard', params);
    if (!error && rows) setData(rows);
    setLoading(false);
  }, [activeTab, timeRange]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Leaderboard</Text>

        {/* UChicago / Friends / Time toggle — equally spaced */}
        <View style={styles.tabBar}>
        <View style={styles.tabsLeft}>
          <AnimatedTab
            label="UChicago"
            active={activeTab === 'all'}
            onPress={() => setActiveTab('all')}
          />
          <AnimatedTab
            label="Friends"
            active={activeTab === 'friends'}
            onPress={() => setActiveTab('friends')}
          />
        </View>
        <Pressable onPress={() => setTimeRange(timeRange === 'week' ? 'alltime' : 'week')}>
          <Text style={styles.timeToggleText}>
            {timeRange === 'week' ? 'This Week' : 'All Time'} ▾
          </Text>
        </Pressable>
        </View>
        <View style={styles.headerDivider} />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <GargoyleLoader size={80} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'friends' ? '👋' : '📍'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'friends'
              ? 'Add friends to see them here!'
              : 'No one has studied yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <LeaderboardRow
              item={item}
              isMe={item.user_id === currentUserId}
              onPress={() => {
                if (item.user_id !== currentUserId) {
                  navigation.navigate('FriendProfile', {
                    friend: {
                      id: item.user_id,
                      display_name: item.display_name,
                      email: item.email,
                      avatar_url: item.avatar_url,
                    },
                  });
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blue,
  },
  headerSection: {
    paddingHorizontal: 24,
    backgroundColor: COLORS.blue,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
  },
  pageTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 38,
    color: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  tabsLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 20,
    height: 26,
  },
  leaderboardTabText: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    color: '#fff',
  },

  // Time range toggle
  timeToggleText: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    color: '#fff',
    opacity: 0.5,
    marginRight: 14,
  },


  // List
  list: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 10,
  },

  // Card row
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardMe: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brown,
    opacity: 0.4,
    textAlign: 'center',
  },
  rankTop3: {
    fontFamily: FONTS.ghibli,
    fontSize: 24,
    color: COLORS.brown,
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: '#fff',
  },
  nameCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInfo: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.ghibli,
    fontSize: 16,
    color: COLORS.brown,
  },
  nameTop3: {
    color: COLORS.brown,
  },
  hours: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: COLORS.brown,
  },
  // Empty / loading
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
