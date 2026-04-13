import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../config/supabase.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import ProfileHeader from '../components/ProfileHeader.jsx';
import ConfessionCard from '../components/ConfessionCard.jsx';
import TemporalConfessionCard from '../components/TemporalConfessionCard.jsx';
import Loader from '../components/ui/Loader.jsx';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
    const { username } = useParams();
    const { user: currentUser } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [confessions, setConfessions] = useState([]);
    const [temporalMode, setTemporalMode] = useState(false);
    const [loading, setLoading] = useState(true);

    const isOwnProfile = currentUser?.username === username;

    useEffect(() => {
        fetchProfile();
    }, [username]);

    useEffect(() => {
        if (profileUser) {
            fetchConfessions();
        }
    }, [profileUser, temporalMode]);

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

    const fetchConfessions = async () => {
        if (temporalMode) {
            // Fetch all confessions including deleted
            const { data: allConfessions } = await supabase
                .from('confessions')
                .select('*, users(display_name, username)')
                .eq('user_id', profileUser.id)
                .order('created_at', { ascending: false });

            // Fetch edit history
            const { data: edits } = await supabase
                .from('confession_edits')
                .select('*')
                .in('confession_id', allConfessions?.map(c => c.id) || []);

            // Merge edits with confessions
            const confessionsWithEdits = (allConfessions || []).map(confession => ({
                ...confession,
                originalVersion: edits?.find(e => e.confession_id === confession.id),
            }));

            setConfessions(confessionsWithEdits);
        } else {
            // Normal mode: only non-deleted
            const { data } = await supabase
                .from('confessions')
                .select('*, users(display_name, username)')
                .eq('user_id', profileUser.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            setConfessions(data || []);
        }
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

    return (
        <div>
            <PageHeader title={profileUser.display_name} backButton />
            <ProfileHeader
                user={profileUser}
                isOwnProfile={isOwnProfile}
                temporalMode={temporalMode}
                onToggleTemporal={() => setTemporalMode(!temporalMode)}
            />
            <div className={styles.confessions}>
                {confessions.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No confessions yet</p>
                    </div>
                ) : (
                    confessions.map((confession) =>
                        temporalMode ? (
                            <TemporalConfessionCard
                                key={confession.id}
                                confession={confession}
                                originalVersion={confession.originalVersion}
                                currentUserId={currentUser?.id}
                            />
                        ) : (
                            <ConfessionCard
                                key={confession.id}
                                confession={confession}
                                currentUserId={currentUser?.id}
                            />
                        )
                    )
                )}
            </div>
        </div>
    );
}
