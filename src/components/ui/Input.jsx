import styles from './Input.module.css';

/**
 * Input
 * Props:
 *   label      — string (shown above input)
 *   placeholder — string
 *   type       — 'text' | 'password' | 'email'  (default: 'text')
 *   value      — controlled value
 *   onChange   — handler
 *   error      — string (shown in red below input)
 *   hint       — string (shown in muted below input)
 *   icon       — JSX element shown at the left inside the input
 *   maxLength  — number
 *   disabled   — bool
 */
export default function Input({
    label,
    placeholder,
    type = 'text',
    value,
    onChange,
    error,
    hint,
    icon,
    maxLength,
    disabled = false,
    id,
}) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className={styles.wrapper}>
            {label && (
                <label htmlFor={inputId} className={styles.label}>
                    {label}
                </label>
            )}
            <div className={`${styles.inputWrapper} ${error ? styles.hasError : ''} ${icon ? styles.hasIcon : ''}`}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <input
                    id={inputId}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    disabled={disabled}
                    className={styles.input}
                />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            {hint && !error && <p className={styles.hint}>{hint}</p>}
        </div>
    );
}
