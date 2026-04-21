import { useNavigate } from 'react-router-dom';
import { BackIcon } from './icons.jsx';
import styles from './PageHeader.module.css';

/**
 * PageHeader
 * Props:
 *   title      — string
 *   backButton — bool (shows ← arrow that calls navigate(-1))
 *   children   — optional right-side content (e.g., action buttons)
 */
export default function PageHeader({ title, backButton = false, children }) {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <div className={styles.leftSection}>
                {backButton && (
                    <button className={styles.backButton} onClick={() => navigate(-1)}>
                        <BackIcon size={20} />
                    </button>
                )}
                <h1 className={styles.title}>{title}</h1>
            </div>
            {children && <div className={styles.rightSection}>{children}</div>}
        </header>
    );
}
