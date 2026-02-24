import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
    const { isAuth, isRole } = useAuth();
    const location = useLocation();

    if (!isAuth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !isRole(...roles)) {
        return <Navigate to="/acesso-negado" replace />;
    }

    return children;
}
