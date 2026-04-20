import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import styles from './LoginPage.module.css';

export default function LoginPage() {
    const { signIn, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('credentials');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            <div className={styles.card}>
                <h1 className={styles.logo}>Confessions</h1>
                <p className={styles.subtitle}>Share your truth</p>

                {step === 'credentials' ? (
                    <form onSubmit={handleCredentials} className={styles.form}>
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                ) : (
                    <form onSubmit={handleOtp} className={styles.form}>
                        <p className={styles.subtitle}>
                            A 6-digit verification code was sent to{' '}
                            <strong>{email}</strong>. Check your inbox.
                        </p>
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
                )}

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                <p className={styles.signup}>
                    Don't have an account? <Link to="/register">Sign up</Link>
                </p>
            </div>
        </div>
    );
}