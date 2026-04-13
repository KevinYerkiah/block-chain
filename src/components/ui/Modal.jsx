import { useEffect } from 'react';
import styles from './Modal.module.css';

/**
 * Modal
 * Props:
 *   isOpen   — bool
 *   onClose  — function
 *   title    — string
 *   children — content
 */
export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {title && <h2 className={styles.title}>{title}</h2>}
                <div className={styles.content}>{children}</div>
            </div>
        </div>
    );
}
