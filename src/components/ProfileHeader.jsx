import Avatar from './ui/Avatar.jsx';
import Button from './ui/Button.jsx';
import Badge from './ui/Badge.jsx';
import styles from './ProfileHeader.module.css';

export default function ProfileHeader({
    user,
    isOwnProfile,
    temporalMode,
    onToggleTemporal,
}) {
    return (
        <div className={styles.header}>
            <div className={styles.cover} style={{ backgroundImage: 'url(/default-cover.jpg)' }} />
            <div className={styles.info}>
                <div className={styles.avatarRow}>
                    <Avatar size="lg" />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleTemporal}
                        className={temporalMode ? styles.temporalActive : ''}
                    >
                        Temporal
                    </Button>
                </div>
                <div className={styles.details}>
                    <div className={styles.nameRow}>
                        <h1 className={styles.displayName}>{user.display_name}</h1>
                        {user.is_burned && <Badge variant="danger">Burned</Badge>}
                    </div>
                    <p className={styles.username}>@{user.username}</p>
                    {user.bio && <p className={styles.bio}>{user.bio}</p>}
                </div>
            </div>
        </div>
    );
}
