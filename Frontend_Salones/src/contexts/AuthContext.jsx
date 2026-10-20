import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api.js";
import { AuthContext, getTokenExp } from "./auth";

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token") || null);
    const [user, setUser] = useState(() => {
        try {
            const data = localStorage.getItem("user");
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (!token) {
            setUser(null);
            return;
        }
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch {
            setUser(null);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;

        const exp = getTokenExp(token);
        if (!exp) return;

        const msUntilExp = exp * 1000 - Date.now();

        if (msUntilExp <= 0) {
            setUser(null);
            setToken(null);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/session-expired";
            return;
        }

        const timeoutId = setTimeout(() => {
            setUser(null);
            setToken(null);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/session-expired";
        }, msUntilExp);

        return () => clearTimeout(timeoutId);
    }, [token]);

    const saveAuth = (usuario, nuevoToken) => {
        setUser(usuario);
        setToken(nuevoToken);
        localStorage.setItem("token", nuevoToken);
        localStorage.setItem("user", JSON.stringify(usuario));
    };

    const login = async (email, contrasena) => {
        try {
            const data = await apiFetch("/login/inicio", {
                method: "POST",
                body: { email, contrasena },
            });

            saveAuth(data.usuario, data.token);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message || "Error de conexión con el servidor" };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    };

    const updateToken = (nuevoToken) => {
        setToken(nuevoToken);
        localStorage.setItem("token", nuevoToken);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, updateToken }}>
            {children}
        </AuthContext.Provider>
    );
}


