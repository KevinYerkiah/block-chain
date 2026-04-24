import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                color: '#78716C',
            }}>
                Loading...
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    return children ? children : <Outlet />;
}
