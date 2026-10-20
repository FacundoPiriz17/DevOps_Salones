import ResponsiveModal from "./ResponsiveModal";
import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

export default function EdificioInfoModal({ open, onClose, edificio, token }) {
    const [salas, setSalas] = useState([]);

    useEffect(() => {
        if (!open) return;
        let ignore = false;
        async function load() {
            try {
                const data = await apiFetch(`/salas/${encodeURIComponent(edificio)}`, { token });
                if (!ignore) setSalas(Array.isArray(data) ? data : []);
            } catch {
                if (!ignore) setSalas([]);
            }
        }
        load();
        return () => { ignore = true; };
    }, [open, edificio, token]);

    if (!open) return null;

    const renderStars = (puntaje) => {
        const score = Number(puntaje) || 0;
        const full = "★".repeat(score);
        const empty = "☆".repeat(5 - score);
        return full + empty;
    };

    return (
        <ResponsiveModal title="Información del edificio" onClose={onClose} className="max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                        Salas · {edificio}
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="grid max-h-[60vh] gap-2 overflow-auto">
                    {salas.map((s) => (
                        <div
                            key={`${s.nombre_sala}-${s.edificio}`}
                            className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-sky-200 hover:bg-sky-50/80"
                        >
                            {/* Nombre + estado */}
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 gap-2">
                                <div className="font-semibold text-slate-900">
                                    {s.nombre_sala}
                                </div>
                                <span
                                    className={
                                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                                        (s.disponible
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200")
                                    }
                                >
                                    {s.disponible ? "Disponible" : "No disponible"}
                                </span>
                            </div>

                            {/* Capacidad y tipo */}
                            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                <span className="inline-flex items-center rounded-full bg-white/60 px-2 py-0.5">
                                    Capacidad: <span className="ml-1 font-medium">{s.capacidad}</span>
                                </span>
                                <span className="inline-flex items-center rounded-full bg-white/60 px-2 py-0.5">
                                    Tipo: <span className="ml-1 font-medium">{s.tipo_sala}</span>
                                </span>
                            </div>

                            {/* Puntaje */}
                            <div className="mt-1 flex items-center gap-1">
                                <span className="text-xs font-medium text-slate-500">
                                    Puntaje:
                                </span>
                                <span className="text-sm leading-none text-amber-500">
                                    {renderStars(s.puntaje)}
                                </span>
                                <span className="text-xs text-slate-400">
                                    ({s.puntaje ?? "-"} / 5)
                                </span>
                            </div>
                        </div>
                    ))}

                    {salas.length === 0 && (
                        <div className="text-sm text-slate-600">
                            No hay salas para este edificio.
                        </div>
                    )}
                </div>
            
        </ResponsiveModal>
    );
}
