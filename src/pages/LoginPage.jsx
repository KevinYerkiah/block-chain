import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import styles from './LoginPage.module.css';
import cover1 from '../cover/cover1.jpeg';
import cover2 from '../cover/cover2.jpeg';
import cover3 from '../cover/cover3.jpeg';

const covers = [cover1, cover2, cover3];

export default function LoginPage() {
    const { user, loading: authLoading, signIn } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && user) {
            navigate('/', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            await signIn(email, password);
        } catch (err) {
            setError(err.message || 'Invalid email or password');
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
                        <h2 className={styles.title}>Welcome back</h2>
                        <p className={styles.subtitle}>Sign in to continue sharing</p>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                            {error && <p className={styles.error}>{error}</p>}
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                loading={loading}
                                disabled={!email || !password}
                            >
                                Log in
                            </Button>
                        </form>

                        <div className={styles.divider}>
                            <span>New here?</span>
                        </div>

                        <Link to="/register" className={styles.secondaryButton}>
                            Create an account
                        </Link>
                    </div>

                    <p className={styles.footer}>
                        Secure • Anonymous • Blockchain-powered
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
                        <h2 className={styles.overlayTitle}>Share your truth</h2>
                        <p className={styles.overlayText}>
                            Anonymous confessions with optional blockchain permanence. 
                            Your voice, your choice.
                        </p>
                        <div className={styles.features}>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>🔒</span>
                                <span>End-to-end encrypted</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>⛓</span>
                                <span>Blockchain verified</span>
                            </div>
                            <div className={styles.feature}>
                                <span className={styles.featureIcon}>👤</span>
                                <span>Fully anonymous</span>
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