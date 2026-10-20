import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CgProfile } from "react-icons/cg";
import { FaBell } from "react-icons/fa";
import NotificationsDropdown from "./NotificationsDropdown";
import { useAuth } from "../contexts/auth";
import { apiFetch } from "../utils/api";
import ucuRoomsLogo from "../assets/ucurooms_White.png";
import { toast } from "react-toastify";

export default function Navbar({ onInvitationsChanged = () => {} }) {
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();

    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const actionsRef = useRef(null);

    const role = user?.rol;

    const pendingCount = useMemo(() => items.length, [items]);

    useEffect(() => {
        function dismiss(event) {
            if (event.key === "Escape" || (event.type === "pointerdown" && !actionsRef.current?.contains(event.target))) {
                setNotifOpen(false);
                setProfileOpen(false);
            }
        }
        document.addEventListener("pointerdown", dismiss);
        document.addEventListener("keydown", dismiss);
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("keydown", dismiss);
        };
    }, []);

    useEffect(() => {
        let ignore = false;

        async function load() {
            try {
                setLoading(true);
                const data = await apiFetch("/reservas/invitaciones?estado=pendiente", {
                    token,
                });
                if (!ignore) setItems(Array.isArray(data) ? data : []);
            } catch {
                if (!ignore) setItems([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        if (token && role === "Participante") load();
        else setItems([]);

        return () => {
            ignore = true;
        };
    }, [token, role]);

    async function handleConfirm(n, estado) {
        try {
            await apiFetch(`/reservas/confirmacion/${n.reservaId}`, {
                method: "PATCH",
                token,
                body: { confirmacion: estado },
            });
            setItems((prev) => prev.filter((x) => x.id !== n.id));
            onInvitationsChanged();
            toast.success(
                estado === "Confirmado"
                    ? "Invitación aceptada."
                    : "Invitación rechazada."
            );
        } catch (e) {
            toast.error(e.message || "No se pudo actualizar la invitación.");
        }
    }

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <header className="sticky top-0 z-40 w-full bg-[#0b1743]">
            <div className="mx-auto max-w-7xl px-3 sm:px-6">
                <div className="flex h-20 min-w-0 items-center justify-between gap-2">
                    <Link to={role === "Administrador" ? "/admin" : role === "Funcionario" ? "/funcionario" : "/participante"} className="flex min-w-0 items-center gap-2 rounded-lg text-white" aria-label="DevOps Salones, ir al inicio">
                    <img
                        src={ucuRoomsLogo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12"
                    />
                    <span className="min-w-0 text-sm font-semibold leading-tight sm:text-base">
                        Salones UCU
                        <span className="block text-xs font-normal tracking-wide text-blue-200">Proyecto DevOps</span>
                    </span>
                    </Link>

                    <div ref={actionsRef} className="relative flex shrink-0 items-center gap-1 sm:gap-3">
                        {role === "Participante" && (
                            <>
                                <button
                                    onClick={() => {
                                        setNotifOpen((v) => !v);
                                        setProfileOpen(false);
                                    }}
                                    aria-label={`Notificaciones${pendingCount ? `: ${pendingCount} pendientes` : ""}`}
                                    aria-expanded={notifOpen}
                                    aria-controls="notifications-panel"
                                    className="relative flex items-center justify-center rounded-full p-2 hover:bg-white/10"
                                >
                                    <FaBell className="text-white" />

                                    {pendingCount > 0 && (
                                        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                                    )}
                                </button>

                                <div className="relative">
                                    <NotificationsDropdown
                                        open={notifOpen}
                                        onClose={() => setNotifOpen(false)}
                                        items={items}
                                        loading={loading}
                                        onAccept={(n) => handleConfirm(n, "Confirmado")}
                                        onReject={(n) => handleConfirm(n, "Rechazado")}
                                    />
                                </div>
                            </>
                        )}

                        <button
                            aria-label={`Opciones de ${user?.nombre ?? "usuario"}`}
                            aria-expanded={profileOpen}
                            aria-controls="profile-options"
                            onClick={() => {
                                setProfileOpen((v) => !v);
                                setNotifOpen(false);
                            }}
                            className="group inline-flex min-w-0 items-center gap-2 rounded-xl border border-white/20 px-2 py-2 text-sm font-medium text-white hover:bg-white/10 sm:px-3"
                        >
                            <CgProfile size={18} className="hidden shrink-0 sm:block" />
                            <div className="flex min-w-0 max-w-14 flex-col items-start sm:max-w-44">
                                <span className="max-w-full truncate">{user?.nombre ?? "Usuario"}</span>
                                <span className="max-w-full truncate text-xs text-slate-300">
                  {role ?? ""}
                </span>
                            </div>
                            <span className="opacity-70 group-hover:opacity-100">▾</span>
                        </button>

                        {profileOpen && (
                            <div id="profile-options" className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white shadow-lg border border-slate-200 py-2 text-sm">
                                <button
                                    onClick={() => { setProfileOpen(false); navigate("/perfil"); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-100"
                                >
                                    Ver perfil
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-slate-100"
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
