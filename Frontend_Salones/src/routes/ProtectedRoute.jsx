import {Navigate, Outlet, useLocation, useNavigate} from "react-router-dom";
import { useAuth, getTokenExp } from "../contexts/auth";
import {useEffect} from "react";

export default function ProtectedRoute({ requiredRole, requiredRoles }) {
    const { user, token } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || !token) return;

        const exp = getTokenExp(token);
        if (!exp) return;

        const WARNING_OFFSET_MS = 10 * 60 * 1000; // 10 minutos
        const msUntilExp = exp * 1000 - Date.now();

        if (msUntilExp <= 0) {
            return;
        }

        const msUntilWarning = msUntilExp - WARNING_OFFSET_MS;
        let warningTimeoutId;

        const goToSessionExpired = () => {
            navigate("/session-expired", {
                replace: true,
                state: { from: location },
            });
        };

        if (msUntilWarning > 0) {
            warningTimeoutId = setTimeout(goToSessionExpired, msUntilWarning);
        } else {
            goToSessionExpired();
        }

        return () => {
            if (warningTimeoutId) clearTimeout(warningTimeoutId);
        };
    }, [user, token, navigate, location]);

    if (!user || !token) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const allowedRoles = [];

    if (requiredRole) {
        allowedRoles.push(requiredRole);
    }

    if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
        allowedRoles.push(...requiredRoles);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}