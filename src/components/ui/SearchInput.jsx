import { useState, useEffect } from 'react';
import { SearchIcon } from './icons.jsx';
import styles from './SearchInput.module.css';

/**
 * SearchInput
 * Props:
 *   placeholder — string
 *   onSearch    — function (called with search term after debounce)
 *   debounceMs  — number (default: 300)
 */
export default function SearchInput({ placeholder, onSearch, debounceMs = 300 }) {
    const [value, setValue] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, debounceMs, onSearch]);

    return (
        <div className={styles.wrapper}>
            <SearchIcon size={20} color="var(--text-secondary)" />
            <input
                type="text"
                className={styles.input}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
        </div>
    );
}
