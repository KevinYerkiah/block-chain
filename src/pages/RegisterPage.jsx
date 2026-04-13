import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { sanitizeUsername, sanitizeDisplayName } from '../security/sanitize.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import styles from './RegisterPage.module.css';

export default function RegisterPage() {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validation
            const cleanUsername = sanitizeUsername(username);
            const cleanDisplayName = sanitizeDisplayName(displayName);

            if (cleanUsername.length < 3 || cleanUsername.length > 50) {
                throw new Error('Username must be 3-50 characters');
            }
            if (cleanDisplayName.length < 1 || cleanDisplayName.length > 100) {
                throw new Error('Display name must be 1-100 characters');
            }
            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            await signUp(email, password, cleanUsername, cleanDisplayName);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.logo}>Confessions</h1>
                <p className={styles.subtitle}>Share your truth</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        hint="This is public and permanent"
                    />
                    <Input
                        type="text"
                        placeholder="Display name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        hint="Minimum 8 characters"
                    />
                    <Input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                        disabled={!email || !username || !displayName || !password || !confirmPassword}
                    >
                        Create Account
                    </Button>
                </form>

                <p className={styles.login}>
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}
