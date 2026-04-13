import styles from './Loader.module.css';

/**
 * Loader
 * Props:
 *   size  — 'sm' | 'md'  (default: 'md')
 *   color — CSS color value (default: 'currentColor')
 */
export default function Loader({ size = 'md', color = 'currentColor' }) {
    return (
        <div className={`${styles.loader} ${styles[size]}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" strokeLinecap="round" className={styles.spinner} />
            </svg>
        </div>
    );
}
