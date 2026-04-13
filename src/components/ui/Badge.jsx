import styles from './Badge.module.css';

/**
 * Badge
 * Props:
 *   variant  — 'default' | 'danger' | 'success' | 'warning'  (default: 'default')
 *   children — content
 */
export default function Badge({ variant = 'default', children }) {
    return (
        <span className={`${styles.badge} ${styles[variant]}`}>
            {children}
        </span>
    );
}
