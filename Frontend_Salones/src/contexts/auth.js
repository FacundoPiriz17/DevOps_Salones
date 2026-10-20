import { createContext, useContext } from "react";

export const AuthContext = createContext();

export function getTokenExp(token) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const base64 = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(parts[1].length + (4 - (parts[1].length % 4)) % 4, "=");

        const json = JSON.parse(atob(base64));
        return json.exp || null;
    } catch {
        return null;
    }
}

export const useAuth = () => useContext(AuthContext);
