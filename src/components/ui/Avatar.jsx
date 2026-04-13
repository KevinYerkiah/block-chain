import styles from './Avatar.module.css';

/**
 * Avatar
 * Props:
 *   size — 'sm' (32px) | 'md' (48px) | 'lg' (120px)  (default: 'md')
 *   src  — image URL (defaults to /default-avatar.png)
 *   alt  — alt text
 */
export default function Avatar({ size = 'md', src = '/default-avatar.png', alt = 'Avatar' }) {
    return (
        <img
            src={src}
            alt={alt}
            className={`${styles.avatar} ${styles[size]}`}
        />
    );
}
