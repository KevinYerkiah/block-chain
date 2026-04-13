import { useEffect, useRef } from 'react';
import styles from './Textarea.module.css';

/**
 * Textarea
 * Props:
 *   placeholder — string
 *   value       — controlled value
 *   onChange    — handler
 *   maxLength   — number
 *   rows        — number (default: 3)
 *   autoGrow    — bool (auto-expands height with content)
 *   disabled    — bool
 */
export default function Textarea({
    placeholder,
    value,
    onChange,
    maxLength,
    rows = 3,
    autoGrow = false,
    disabled = false,
}) {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (autoGrow && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value, autoGrow]);

    return (
        <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            rows={rows}
            disabled={disabled}
        />
    );
}
