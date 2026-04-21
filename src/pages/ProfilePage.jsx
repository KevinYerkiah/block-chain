import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../config/supabase.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import ProfileHeader from '../components/ProfileHeader.jsx';
import EditProfileModal from '../components/EditProfileModal.jsx';
import ConfessionCard from '../components/ConfessionCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
    const { username } = useParams();
    const { user: currentUser, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [profileUser, setProfileUser] = useState(null);
    const [confessions, setConfessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [friendRequest, setFriendRequest] = useState(null);
    const [friendActionLoading, setFriendActionLoading] = useState(false);

    const isOwnProfile = currentUser?.username === username;

    useEffect(() => {
        fetchProfile();
    }, [username]);

    useEffect(() => {
        if (profileUser) {
            fetchConfessions();
            if (!isOwnProfile) {
                fetchFriendRequest();
            }
        }
    }, [profileUser]);

    const fetchProfile = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        setProfileUser(data);
        setLoading(false);
    };

    const fetchFriendRequest = async () => {
        if (!currentUser || !profileUser) return;

        const { data } = await supabase
            .from('friend_requests')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

        // Find request involving both users
        const request = data?.find(
            (req) =>
                (req.sender_id === currentUser.id && req.receiver_id === profileUser.id) ||
                (req.sender_id === profileUser.id && req.receiver_id === currentUser.id)
        );

        setFriendRequest(request || null);
    };

    const handleAddFriend = async () => {
        setFriendActionLoading(true);
        try {
            const { data, error } = await supabase
                .from('friend_requests')
                .insert({
                    sender_id: currentUser.id,
                    receiver_id: profileUser.id,
                })
                .select()
                .single();

            if (error) throw error;
            setFriendRequest(data);
        } catch (err) {
            console.error('Failed to send friend request:', err);
        } finally {
            setFriendActionLoading(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!friendRequest) return;

        setFriendActionLoading(true);
        try {
            const { error } = await supabase.rpc('accept_friend_request', {
                p_request_id: friendRequest.id,
            });

            if (error) throw error;

            // Update local state
            setFriendRequest({ ...friendRequest, status: 'accepted' });
        } catch (err) {
            console.error('Failed to accept friend request:', err);
        } finally {
            setFriendActionLoading(false);
        }
    };

    const handleMessage = async () => {
        try {
            // Find existing conversation
            const { data: existingConvo } = await supabase
                .from('conversations')
                .select('id')
                .or(`and(user_a.eq.${currentUser.id},user_b.eq.${profileUser.id}),and(user_a.eq.${profileUser.id},user_b.eq.${currentUser.id})`)
                .maybeSingle();

            if (existingConvo) {
                navigate('/inbox', { state: { conversationId: existingConvo.id } });
            } else {
                // Create new conversation
                const { data: newConvo, error } = await supabase
                    .from('conversations')
                    .insert({
                        user_a: currentUser.id,
                        user_b: profileUser.id,
                    })
                    .select()
                    .single();

                if (error) throw error;

                navigate('/inbox', { state: { conversationId: newConvo.id } });
            }
        } catch (err) {
            console.error('Failed to open conversation:', err);
        }
    };

    const handleProfileSaved = async () => {
        // Refresh the profile data
        await fetchProfile();
        // If it's own profile, refresh the auth context too
        if (isOwnProfile) {
            await refreshUser();
        }
    };

    const fetchConfessions = async () => {
        const { data } = await supabase
            .from('confessions')
            .select('*, users(display_name, username, avatar_index)')
            .eq('user_id', profileUser.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        const confessionIds = (data || []).map((c) => c.id);

        let commentCountsMap = {};

        if (confessionIds.length > 0) {
            const { data: commentsData, error: commentsError } = await supabase
                .from('comments')
                .select('confession_id')
                .in('confession_id', confessionIds);

            if (!commentsError && commentsData) {
                commentCountsMap = commentsData.reduce((acc, comment) => {
                    acc[comment.confession_id] = (acc[comment.confession_id] || 0) + 1;
                    return acc;
                }, {});
            }
        }

        const confessionsWithCounts = (data || []).map((confession) => ({
            ...confession,
            comments_count: commentCountsMap[confession.id] || 0,
        }));

        setConfessions(confessionsWithCounts);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader size="md" />
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className={styles.notFound}>
                <p>User not found</p>
            </div>
        );
    }

    // Determine friend request status for ProfileHeader
    const getFriendRequestStatus = () => {
        if (!friendRequest) return 'none';
        
        if (friendRequest.status === 'pending') {
            if (friendRequest.sender_id === currentUser.id) {
                return 'sent';
            } else {
                return 'received';
            }
        }
        
        if (friendRequest.status === 'accepted') {
            return 'accepted';
        }
        
        return 'none';
    };

    return (
        <div>
            <PageHeader title={profileUser.display_name} backButton />
            <ProfileHeader
                user={profileUser}
                isOwnProfile={isOwnProfile}
                onEditProfile={() => setEditModalOpen(true)}
                onAddFriend={handleAddFriend}
                onAcceptRequest={handleAcceptRequest}
                onMessage={handleMessage}
                friendRequestStatus={getFriendRequestStatus()}
                friendActionLoading={friendActionLoading}
            />
            {isOwnProfile && (
                <EditProfileModal
                    isOpen={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    user={profileUser}
                    onSave={handleProfileSaved}
                />
            )}
            <div className={styles.confessions}>
                {confessions.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No confessions yet</p>
                    </div>
                ) : (
                    confessions.map((confession) => (
                        <ConfessionCard
                            key={confession.id}
                            confession={confession}
                            currentUserId={currentUser?.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
