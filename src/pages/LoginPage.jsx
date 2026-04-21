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
    const { signIn, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('credentials');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentCover, setCurrentCover] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentCover((prev) => (prev + 1) % covers.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCredentials = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signIn(email, password);
            setStep('otp');
        } catch (err) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    const handleOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await verifyOtp(email, otp);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Invalid or expired code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setStep('credentials');
        setError('');
        setOtp('');
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
                        {step === 'credentials' ? (
                            <>
                                <h2 className={styles.title}>Welcome back</h2>
                                <p className={styles.subtitle}>Sign in to continue sharing</p>

                                <form onSubmit={handleCredentials} className={styles.form}>
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
                            </>
                        ) : (
                            <>
                                <h2 className={styles.title}>Verify your identity</h2>
                                <p className={styles.subtitle}>
                                    A 6-digit verification code was sent to{' '}
                                    <strong>{email}</strong>. Check your inbox.
                                </p>

                                <form onSubmit={handleOtp} className={styles.form}>
                                    <Input
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        maxLength={6}
                                    />
                                    {error && <p className={styles.error}>{error}</p>}
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        fullWidth
                                        loading={loading}
                                        disabled={otp.length !== 6}
                                    >
                                        Verify Code
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        fullWidth
                                        onClick={handleBack}
                                    >
                                        ← Back
                                    </Button>
                                </form>
                            </>
                        )}
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