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

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={{ opacity, transform: [{ scale }], transformOrigin: 'left bottom' }}>
        <Text
          style={[
            styles.leaderboardTabText,
            { fontWeight: active ? '700' : '400' },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function ColumnHeaders() {
  return (
    <View style={styles.columnHeaders}>
      <Text style={[styles.colHeaderText, styles.rankCol]}>Rank</Text>
      <Text style={[styles.colHeaderText, styles.nameCol]}>Name</Text>
      <Text style={[styles.colHeaderText, styles.durationCol]}>Time</Text>
      <View style={styles.actionSpacer} />
    </View>
  );
}

function LeaderboardRow({ item, isMe, activeTab }) {
  const name = item.display_name || item.email?.split('@')[0] || 'Anonymous';
  const isTop3 = item.rank <= 3;

  const rankContent = isTop3
    ? <View style={styles.rankIcon}><Text style={styles.rankIconText}>{['🥇', '🥈', '🥉'][item.rank - 1]}</Text></View>
    : <Text style={styles.rank}>{item.rank}</Text>;

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={styles.rankCol}>{rankContent}</View>

      <View style={styles.nameCol}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {name}{isMe ? ' (you)' : ''}
        </Text>
      </View>

      <Text style={[styles.hours, styles.durationCol]}>
        {formatHours(item.total_seconds)}
      </Text>

      {!isMe ? (
        <Pressable style={styles.actionBtn} onPress={() => {}}>
          <Text style={styles.actionText}>
            {activeTab === 'friends' ? 'Poke' : 'Add'}
          </Text>
          <Text style={styles.actionIcon}>
            {activeTab === 'friends' ? '👈' : '➕'}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.actionSpacer} />
      )}
    </View>
  );
}

export default function Leaderboard() {
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
          ListHeaderComponent={ColumnHeaders}
          renderItem={({ item }) => (
            <LeaderboardRow
              item={item}
              isMe={item.user_id === currentUserId}
              activeTab={activeTab}
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
  },


  // List
  list: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },

  // Column headers
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.25)',
    gap: 8,
  },
  colHeaderText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationCol: {
    width: 70,
    textAlign: 'left',
  },
  actionSpacer: {
    width: 60,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  rowMe: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
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
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  rankIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIconText: {
    fontSize: 22,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  nameCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
  },
  hours: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 60,
  },
  actionText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: '#fff',
    textDecorationLine: 'underline',
  },
  actionIcon: {
    fontSize: 14,
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
