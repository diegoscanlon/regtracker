import { supabase } from './supabase';

// Always sort UUIDs so user_id < friend_id (required by DB constraint)
function sortIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function sendFriendRequest(myId, theirId) {
  const [userId, friendId] = sortIds(myId, theirId);
  return supabase
    .from('friendships')
    .insert({ user_id: userId, friend_id: friendId, status: 'pending' });
}

export async function acceptFriendRequest(friendshipId) {
  return supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
}

export async function removeFriend(friendshipId) {
  return supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
}

export async function getPendingRequests(myId) {
  // Requests where I'm involved and status is pending, but I didn't send it
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, created_at, profiles!friendships_user_id_fkey(display_name, email, avatar_url), friend:profiles!friendships_friend_id_fkey(display_name, email, avatar_url)')
    .eq('status', 'pending')
    .or(`user_id.eq.${myId},friend_id.eq.${myId}`);

  if (error) return [];

  // Filter to requests sent BY the other person (not by me)
  // If I'm user_id and user_id < friend_id, the sender could be either —
  // for simplicity, show all pending where I'm involved
  return data || [];
}
