import { useEffect, useRef } from 'react';
import styles from './Textarea.module.css';

/**
 * Textarea
 * Props:
 *   placeholder — string
 *   value       — controlled value
 *   onChange    — handler
 *   onKeyDown   — handler
 *   maxLength   — number
 *   rows        — number (default: 3)
 *   autoGrow    — bool (auto-expands height with content)
 *   disabled    — bool
 *   className   — string
 */
export default function Textarea({
    placeholder,
    value,
    onChange,
    onKeyDown,
    maxLength,
    rows = 3,
    autoGrow = false,
    disabled = false,
    className = '',
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
            className={`${styles.textarea} ${className}`}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            maxLength={maxLength}
            rows={rows}
            disabled={disabled}
        />
    );
}
