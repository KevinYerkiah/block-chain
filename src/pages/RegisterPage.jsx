import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { sanitizeUsername, sanitizeDisplayName } from '../security/sanitize.js';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import styles from './RegisterPage.module.css';
import cover1 from '../cover/cover1.jpeg';
import cover2 from '../cover/cover2.jpeg';
import cover3 from '../cover/cover3.jpeg';

const covers = [cover1, cover2, cover3];

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
    const [currentCover, setCurrentCover] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCover((prev) => (prev + 1) % covers.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

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
            <div className={styles.leftPanel}>
                <div className={styles.content}>
                    <div className={styles.header}>
                        <h1 className={styles.logo}>⛓ Confessions</h1>
                        <p className={styles.tagline}>Your truth, your way</p>
                    </div>

                    <div className={styles.card}>
                        <h2 className={styles.title}>Create account</h2>
                        <p className={styles.subtitle}>Join the community today</p>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                            <Input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                hint="Public and permanent"
                                autoComplete="username"
                            />
                            <Input
                                type="text"
                                placeholder="Display name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                autoComplete="name"
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                hint="Minimum 8 characters"
                                autoComplete="new-password"
                            />
                            <Input
                                type="password"
                                placeholder="Confirm password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                            {error && <p className={styles.error}>{error}</p>}
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={!email || !username || !displayName || !password || !confirmPassword}
                            >
                                Create account
                            </Button>
                        </form>

                        <div className={styles.divider}>
                            <span>Already a member?</span>
                        </div>

                        <Link to="/login" className={styles.secondaryButton}>
                            Sign in instead
                        </Link>
                    </div>

                    <p className={styles.footer}>
                        By signing up, you agree to our Terms and Privacy Policy
                    </p>
                </div>
            </div>

            <div className={styles.rightPanel}>
                {covers.map((cover, index) => (
                    <div
                        key={index}
                        className={`${styles.coverImage} ${index === currentCover ? styles.active : ''}`}
                        style={{ backgroundImage: `url(${cover})` }}
                    />
                ))}
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <h2 className={styles.overlayTitle}>Express yourself freely</h2>
                        <p className={styles.overlayText}>
                            Share confessions anonymously or make them permanent on the blockchain. 
                            The choice is yours.
                        </p>
                        <div className={styles.features}>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>✨</span>
                                <span>Post anonymously</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>🔐</span>
                                <span>Secure & encrypted</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>⏰</span>
                                <span>2-minute edit window</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.coverIndicators}>
                    {covers.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles.indicator} ${index === currentCover ? styles.activeIndicator : ''}`}
                            onClick={() => setCurrentCover(index)}
                            aria-label={`View cover ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
