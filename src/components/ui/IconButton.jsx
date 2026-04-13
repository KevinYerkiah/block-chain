import styles from './IconButton.module.css';

/**
 * IconButton
 * Props:
 *   icon        — JSX element (SVG)
 *   label       — string (screen reader text)
 *   count       — number (optional, shown beside icon)
 *   active      — bool
 *   activeColor — CSS color value
 *   onClick     — function
 */
export default function IconButton({
    icon,
    label,
    count,
    active = false,
    activeColor,
    onClick,
}) {
    const style = active && activeColor ? { color: activeColor } : {};

    return (
        <button
            className={`${styles.iconButton} ${active ? styles.active : ''}`}
            onClick={onClick}
            aria-label={label}
            style={style}
        >
            <span className={styles.icon}>{icon}</span>
            {count !== undefined && <span className={styles.count}>{count}</span>}
        </button>
    );
}
