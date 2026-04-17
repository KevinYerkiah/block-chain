import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../config/supabase.js';
import PageHeader from '../components/ui/PageHeader.jsx';
import ComposeBox from '../components/ComposeBox.jsx';
import ConfessionFeed from '../components/ConfessionFeed.jsx';

export default function HomePage() {
    const { user } = useAuth();
    const [confessions, setConfessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchConfessions();
    }, []);

    const fetchConfessions = async (offset = 0) => {
        setLoading(true);

        const { data, error } = await supabase
            .from('confessions')
            .select('*, users(display_name, username)')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + 49);

        if (!error && data) {
            const confessionIds = data.map((c) => c.id);

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

            const confessionsWithCounts = data.map((confession) => ({
                ...confession,
                comments_count: commentCountsMap[confession.id] || 0,
            }));

            if (offset === 0) {
                setConfessions(confessionsWithCounts);
            } else {
                setConfessions((prev) => [...prev, ...confessionsWithCounts]);
            }

            setHasMore(data.length === 50);
        }

        setLoading(false);
    };

    const handlePosted = (newConfession) => {
        // Add the new confession to the top of the feed immediately
        setConfessions((prev) => [{
             ...newConfession,
             comments_count: 0 },
              ...prev
            ]);
    };

    const handleLoadMore = () => {
        fetchConfessions(confessions.length);
    };

    return (
        <div>
            <PageHeader title="Home" />
            <ComposeBox onPosted={handlePosted} />
            <ConfessionFeed
                confessions={confessions}
                currentUserId={user?.id}
                loading={loading}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
            />
        </div>
    );
}
