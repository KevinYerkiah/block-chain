import styles from './Button.module.css';
import Loader from './Loader.jsx';

/**
 * Button
 * Props:
 *   variant   — 'primary' | 'outline' | 'danger' | 'ghost'  (default: 'primary')
 *   size      — 'sm' | 'md' | 'lg'                          (default: 'md')
 *   fullWidth — bool
 *   disabled  — bool
 *   loading   — bool (shows spinner, disables interaction)
 *   onClick   — function
 *   type      — HTML button type (default: 'button')
 *   children  — content
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    children,
    className = '',
}) {
    const classes = [
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? <Loader size="sm" color="currentColor" /> : children}
        </button>
    );
}
