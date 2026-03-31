import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../constants/theme';
import GargoyleLoader from '../components/GargoyleLoader';

export default function FriendsTab() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const friendIds = friendships.map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url')
      .in('id', friendIds);

    setFriends(profiles || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const getName = (p) => p.display_name || p.email?.split('@')[0] || 'Anonymous';

  if (loading) {
    return (
      <View style={styles.center}>
        <GargoyleLoader size={60} />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No friends yet — add some from the Friends tab!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={friends}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {getName(item).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>{getName(item)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    gap: 12,
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
  name: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
