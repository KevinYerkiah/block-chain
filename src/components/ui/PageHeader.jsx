import { useNavigate } from 'react-router-dom';
import { BackIcon } from './icons.jsx';
import styles from './PageHeader.module.css';

/**
 * PageHeader
 * Props:
 *   title      — string
 *   backButton — bool (shows ← arrow that calls navigate(-1))
 */
export default function PageHeader({ title, backButton = false }) {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            {backButton && (
                <button className={styles.backButton} onClick={() => navigate(-1)}>
                    <BackIcon size={20} />
                </button>
            )}
            <h1 className={styles.title}>{title}</h1>
        </header>
    );
}
