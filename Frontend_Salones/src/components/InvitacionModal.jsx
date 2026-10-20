import ResponsiveModal from "./ResponsiveModal";
import { useEffect, useMemo, useState } from "react";
import { isValidEmail } from "../utils/validators.js";
import { apiFetch } from "../utils/api";
import { toast } from "react-toastify";

export default function InvitacionModal({
                                            open,
                                            onClose,
                                            reservaId,
                                            token,
                                            onSaved,
                                        }) {
    const [entrada, setEntrada] = useState("");
    const [invitados, setInvitados] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setEntrada("");
            setInvitados([]);
            setError("");
        }
    }, [open]);

    const puedeAgregar = useMemo(() => {
        const value = entrada.trim();
        if (!value) return false;
        if (!isValidEmail(value)) return false;
        return !invitados.some(
            (i) => i.email.toLowerCase() === value.toLowerCase()
        );
    }, [entrada, invitados]);

    function agregar() {
        const value = entrada.trim();
        if (!isValidEmail(value)) {
            setError("Ingresa un email válido.");
            return;
        }
        setInvitados((prev) => [...prev, { email: value }]);
        setEntrada("");
        setError("");
    }

    function eliminar(idx) {
        setInvitados((prev) => prev.filter((_, i) => i !== idx));
    }

    async function guardar() {
        if (invitados.length === 0) {
            setError("Agrega al menos un invitado.");
            return;
        }
        try {
            setEnviando(true);
            for (const inv of invitados) {
                await apiFetch("/reservas/invitar", {
                    method: "POST",
                    token,
                    body: {
                        email_invitado: inv.email,
                        id_reserva: reservaId,
                    },
                });
            }
            toast.success("Invitaciones enviadas correctamente.");

            onSaved?.();
            onClose?.();
        } catch (e) {
            setError(e.message || "No se pudo enviar la invitación.");
            toast.error(e.message || "Error al enviar invitaciones.");
        } finally {
            setEnviando(false);
        }
    }

    if (!open) return null;

    return (
        <ResponsiveModal title="Invitar participantes" onClose={onClose} className="max-w-xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                        Invitar participantes
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="grid gap-3">
                    <label className="text-sm">
            <span className="block text-slate-700 mb-1">
              Agregar por Email
            </span>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                value={entrada}
                                onChange={(e) => setEntrada(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && puedeAgregar && agregar()}
                                placeholder="nombre@correo.ucu.edu.uy"
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <button
                                onClick={agregar}
                                disabled={!puedeAgregar}
                                className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                Añadir
                            </button>
                        </div>
                    </label>

                    {error && <div className="text-sm text-red-600">{error}</div>}

                    <div className="max-h-[40vh] overflow-auto rounded-xl border border-slate-200">
                        {invitados.length === 0 ? (
                            <div className="p-3 text-sm text-slate-600">
                                Aún no agregaste invitados.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200">
                                {invitados.map((p, idx) => (
                                    <li
                                        key={idx}
                                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                                    >
                                        <div className="text-sm text-slate-800">
                                            Email: {p.email}
                                        </div>
                                        <button
                                            onClick={() => eliminar(idx)}
                                            className="text-sm text-blue-700 hover:underline"
                                        >
                                            Quitar
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={guardar}
                        disabled={enviando || invitados.length === 0}
                        className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        {enviando ? "Enviando…" : "Enviar invitaciones"}
                    </button>
                </div>
            
        </ResponsiveModal>
    );
}