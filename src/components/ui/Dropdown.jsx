import { useEffect, useRef } from 'react';
import styles from './Dropdown.module.css';

/**
 * Dropdown
 * Props:
 *   isOpen   — bool
 *   onClose  — function
 *   items    — array of { label, icon, onClick, variant }
 *   position — 'above' | 'below'  (default: 'below')
 */
export default function Dropdown({ isOpen, onClose, items, position = 'below' }) {
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className={`${styles.dropdown} ${styles[position]}`}>
            {items.map((item, index) => (
                <button
                    key={index}
                    className={`${styles.item} ${item.variant ? styles[item.variant] : ''}`}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                >
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
}
