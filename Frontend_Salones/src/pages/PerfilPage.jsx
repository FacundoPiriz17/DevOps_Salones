import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/auth";
import { apiFetch } from "../utils/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

function getTokenExp(token) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(parts[1].length + (4 - (parts[1].length % 4)) % 4, "=");
        const json = JSON.parse(atob(payload));
        if (!json.exp) return null;
        return json.exp;
    } catch {
        return null;
    }
}

function formatTimeLeft(sec) {
    if (sec == null) return "--:--";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h > 0) {
        return `${h.toString().padStart(2, "0")}:${m
            .toString()
            .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PerfilPage() {
    const { user, token, updateToken } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [savingPassword, setSavingPassword] = useState(false);

    const [perfil, setPerfil] = useState(null);

    const [secondsLeft, setSecondsLeft] = useState(null);
    const [refreshingSession, setRefreshingSession] = useState(false);

    useEffect(() => {
        if (!token) {
            setSecondsLeft(null);
            return;
        }

        const exp = getTokenExp(token);
        if (!exp) {
            setSecondsLeft(null);
            return;
        }

        const update = () => {
            const nowSec = Date.now() / 1000;
            const diff = Math.max(0, Math.floor(exp - nowSec));
            setSecondsLeft(diff);
        };

        update();

        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [token]);

    async function handleRefreshSession() {
        try {
            setRefreshingSession(true);
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

        } catch (e) {
            toast.error(e.message || "No se pudo renovar la sesión.");

        } finally {
            setRefreshingSession(false);
        }
    }

    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        email: "",
        rol: "",
        ci: "",
    });

    const [passwordForm, setPasswordForm] = useState({
        actual: "",
        nueva: "",
        confirmacion: "",
    });

    const [sanciones, setSanciones] = useState([]);
    const [loadingSanciones, setLoadingSanciones] = useState(false);

    useEffect(() => {
        let ignore = false;
        if (!token) return;

        async function load() {
            try {
                setLoading(true);
                const data = await apiFetch("/login/me", { token });
                if (ignore) return;

                setPerfil(data);
                setForm({
                    nombre: data.nombre ?? user?.nombre ?? "",
                    apellido: data.apellido ?? user?.apellido ?? "",
                    email: data.email ?? user?.email ?? "",
                    rol: data.rol ?? user?.rol ?? "",
                    ci: String(data.ci ?? user?.ci ?? ""),
                });
            } catch (e) {
                if (!ignore) {
                    toast.error(e.message || "No se pudo cargar el perfil.");
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        load();
        return () => {
            ignore = true;
        };
    }, [token, user?.ci, user?.nombre, user?.apellido, user?.rol, user?.email]);

    useEffect(() => {
        let ignore = false;
        if (!token) return;

        async function loadSanctions() {
            try {
                setLoadingSanciones(true);
                const data = await apiFetch("/sanciones/mias", { token });
                if (!ignore) setSanciones(Array.isArray(data) ? data : []);
            } catch {
                if (!ignore) setSanciones([]);
            } finally {
                if (!ignore) setLoadingSanciones(false);
            }
        }

        loadSanctions();
        return () => {
            ignore = true;
        };
    }, [token]);

    function handlePasswordChange(e) {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleChangePassword(e) {
        e.preventDefault();

        if (!passwordForm.actual || !passwordForm.nueva || !passwordForm.confirmacion) {
            toast.error("Completa todos los campos de contraseña.");
            return;
        }
        if (passwordForm.nueva !== passwordForm.confirmacion) {
            toast.error("La nueva contraseña y su confirmación no coinciden.");

            return;
        }

        try {
            setSavingPassword(true);
            await apiFetch("/login/cambiar-contrasena", {
                method: "POST",
                token,
                body: {
                    contrasena_actual: passwordForm.actual,
                    contrasena_nueva: passwordForm.nueva,
                },
            });

            toast.success("Contraseña actualizada correctamente.");

            setPasswordForm({ actual: "", nueva: "", confirmacion: "" });
        } catch (e) {
            toast.error(e.message || "No se pudo cambiar la contraseña.");

        } finally {
            setSavingPassword(false);
        }
    }

    const rol = form.rol || user?.rol;

    function handleGoHome() {
        if (rol === "Administrador") {
            navigate("/admin");
        } else if (rol === "Funcionario") {
            navigate("/funcionario");
        } else {
            navigate("/participante");
        }
    }

    return (
        <div className="min-h-dvh flex flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1">
                <div className="mx-auto max-w-5xl px-4 py-8">
                    <div className="mb-6 flex flex-col gap-2">
                        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
                                <p className="text-sm text-slate-600">
                                    Gestiona tus datos personales, rol y opciones de seguridad.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleGoHome}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                            >
                                Volver a la página principal
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl bg-white p-6 shadow-sm">
                            <p className="text-sm text-slate-500">Cargando perfil...</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-3">

                            <section className="lg:col-span-1 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 truncate">
                                            {form.nombre} {form.apellido}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">CI {form.ci}</p>
                                        <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {rol}
                    </span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-slate-700">
                                    <div>
                                        <span className="text-slate-500">Email:</span>
                                        <div className="truncate">{form.email}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Rol en el sistema:</span>
                                        <div>{rol}</div>
                                    </div>
                                </div>

                                {perfil?.programas?.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold text-slate-600 mb-1">
                                            Programas académicos:
                                        </p>
                                        <ul className="text-sm text-slate-700 list-disc ml-4">
                                            {perfil.programas.map((p, idx) => (
                                                <li key={idx}>
                                                    {p.nombre_plan} · {p.rol} ({p.tipo})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </section>

                            <section className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                                    Datos personales
                                </h2>

                                <div className="space-y-4 text-sm text-slate-800">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 mb-1">
                                                Nombre
                                            </p>
                                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                {form.nombre || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 mb-1">
                                                Apellido
                                            </p>
                                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                {form.apellido || "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 mb-1">
                                                Email institucional
                                            </p>
                                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 break-all">
                                                {form.email || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 mb-1">
                                                Rol
                                            </p>
                                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                {rol || "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-medium text-slate-600 mb-1">
                                                Cédula
                                            </p>
                                            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                {form.ci || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="lg:col-span-1 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                                    Seguridad
                                </h2>
                                <form onSubmit={handleChangePassword} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Contraseña actual
                                        </label>
                                        <input
                                            type="password"
                                            name="actual"
                                            value={passwordForm.actual}
                                            onChange={handlePasswordChange}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Nueva contraseña
                                        </label>
                                        <input
                                            type="password"
                                            name="nueva"
                                            value={passwordForm.nueva}
                                            onChange={handlePasswordChange}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Confirmar nueva contraseña
                                        </label>
                                        <input
                                            type="password"
                                            name="confirmacion"
                                            value={passwordForm.confirmacion}
                                            onChange={handlePasswordChange}
                                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-base sm:text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="mt-1 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
                                    </button>
                                </form>

                                <div className="mt-6 border-t border-slate-200 pt-4">
                                    <h3 className="text-xs font-semibold text-slate-700 mb-1">
                                        Sesión actual
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Tiempo de logueo restante antes de que el token expire.
                                    </p>
                                    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-800">
        {secondsLeft != null ? formatTimeLeft(secondsLeft) : "--:--"}
      </span>
                                        <button
                                            type="button"
                                            onClick={handleRefreshSession}
                                            disabled={refreshingSession}
                                            className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                                        >
                                            {refreshingSession ? "Renovando..." : "Renovar sesión"}
                                        </button>
                                    </div>
                                </div>

                            </section>



                            {rol === "Participante" && (
                                <section className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                                    <h2 className="text-sm font-semibold text-slate-900 mb-3">
                                        Información académica y sanciones
                                    </h2>

                                    <div>
                                        <p className="text-xs font-semibold text-slate-600 mb-1">
                                            Sanciones activas:
                                        </p>

                                        {loadingSanciones ? (
                                            <p className="text-sm text-slate-500">Cargando sanciones...</p>
                                        ) : sanciones.length === 0 ? (
                                            <p className="text-sm text-emerald-600">No tienes sanciones activas.</p>
                                        ) : (
                                            <ul className="divide-y divide-slate-200 text-sm">
                                                {sanciones.map((s) => (
                                                    <li
                                                        key={s.id_sancion}
                                                        className="py-2 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="font-medium text-slate-800">
                                                                {s.motivo}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                Desde {s.fecha_inicio} hasta {s.fecha_fin}
                                                            </div>
                                                        </div>
                                                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                Activa
                            </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
