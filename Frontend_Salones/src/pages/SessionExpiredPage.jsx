import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth, getTokenExp } from "../contexts/auth";
import { apiFetch } from "../utils/api";
import { toast } from "react-toastify";
import { FaLock } from "react-icons/fa"; // Ícono de candado
import ucuRoomsLogo from "../assets/ucurooms.png"; // Logo UcuRooms

export default function SessionExpiredPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { token, updateToken, logout } = useAuth();

    const [loadingRefresh, setLoadingRefresh] = useState(false);
    const [visible, setVisible] = useState(false);
    const [timeLeftMs, setTimeLeftMs] = useState(null);

    useEffect(() => {
        if (!token) {
            setTimeLeftMs(null);
            return;
        }

        const exp = getTokenExp(token);
        if (!exp) {
            setTimeLeftMs(null);
            return;
        }

        const update = () => {
            const msLeft = exp * 1000 - Date.now();
            setTimeLeftMs(msLeft > 0 ? msLeft : 0);
        };

        update();
        const intervalId = setInterval(update, 1000);

        return () => clearInterval(intervalId);
    }, [token]);
    const fromPath = location.state?.from?.pathname || "/perfil";

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timeout);
    }, []);

    async function handleRefresh() {
        try {
            setLoadingRefresh(true);
            const res = await apiFetch("/login/renovar-token", {
                method: "POST",
                token,
            });

            const nuevoToken = res.token;
            if (!nuevoToken) {
                throw new Error("No se recibió un token nuevo desde el servidor.");
            }

            updateToken(nuevoToken);

            toast.success("Sesión renovada correctamente.");


            navigate(fromPath, { replace: true });
        } catch (e) {
            toast.error(e.message || "No se pudo renovar la sesión.");

        } finally {
            setLoadingRefresh(false);
        }
    }

    function handleGoLogin() {
        logout();
        navigate("/login", { replace: true });
    }

    let countdownText = null;
    if (timeLeftMs !== null) {
        const totalSeconds = Math.floor(timeLeftMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        countdownText = `${minutes}:${seconds}`;
    }

    return (
        <div className="auth-screen">

            <div
                className={`relative bg-white/90 backdrop-blur-md p-5 sm:p-8 rounded-2xl shadow-xl w-full max-w-md z-10 transform transition-all duration-700 ease-out
                ${
                    visible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-10"
                }
            `}
            >
                <div className="flex justify-center mb-3">
                    <img
                        src={ucuRoomsLogo}
                        alt="UCU Salones · DevOps"
                        className="w-20 h-20 object-contain drop-shadow-md"
                    />
                </div>

                <div className="mx-auto mb-4 flex items-center justify-center h-14 w-14 rounded-full bg-blue-900 shadow-md">
                    <FaLock className="text-white text-2xl" />
                </div>

                <h1 className="text-xl sm:text-2xl font-semibold text-center mb-2 text-blue-900 drop-shadow-sm">
                    Sesión expirada
                </h1>

                <p className="text-sm text-slate-700 mb-6 text-center">
                    Tu sesión ha caducado o tu token ya no es válido. Elegí cómo querés continuar.
                </p>
                {countdownText && (
                    <p className="text-sm font-medium text-center text-red-600 mb-4">
                        La sesión se cerrará automáticamente en{" "}
                        <span className="tabular-nums">{countdownText}</span>.
                    </p>
                )}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loadingRefresh || !token}
                        className="w-full bg-blue-900 text-white p-2 rounded-xl hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-60"
                    >
                        {loadingRefresh ? "Renovando sesión..." : "Renovar sesión"}
                    </button>

                    <button
                        type="button"
                        onClick={handleGoLogin}
                        className="w-full border border-gray-300 text-slate-800 p-2 rounded-xl bg-white hover:bg-slate-50 transition text-sm font-semibold"
                    >
                        Volver al login
                    </button>
                </div>
            </div>
        </div>
    );
}
