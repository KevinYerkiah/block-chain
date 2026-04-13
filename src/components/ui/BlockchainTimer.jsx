import { useState, useEffect } from 'react';
import styles from './BlockchainTimer.module.css';

/**
 * BlockchainTimer
 * Shows countdown until blockchain upload (1 hour after post)
 * Props:
 *   uploadAt — ISO timestamp when upload will happen (edit_window_expires_at)
 *   isOnChain — bool, if already on chain
 */
export default function BlockchainTimer({ uploadAt, isOnChain }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (isOnChain || !uploadAt) return;

        const updateTimer = () => {
            const now = Date.now();
            const target = new Date(uploadAt).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft('Ready for blockchain');
                return;
            }

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m until blockchain`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s until blockchain`);
            } else {
                setTimeLeft(`${seconds}s until blockchain`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [uploadAt, isOnChain]);

    if (isOnChain) {
        return <span className={`${styles.timer} ${styles.onChain}`}>✓ On blockchain</span>;
    }

    if (!timeLeft) return null;

    return <span className={styles.timer}>{timeLeft}</span>;
}
