import ResponsiveModal from "./ResponsiveModal";
import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import { useAuth } from "../contexts/auth";
import { apiFetch } from "../utils/api";
import { toast } from "react-toastify";

export default function ResenaModal({ open, onClose, reserva, token, onSaved }) {
    const { user } = useAuth();

    const [rating, setRating] = useState(0);
    const [descripcion, setDescripcion] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setRating(0);
            setDescripcion("");
            setError("");
        }
    }, [open, reserva?.id_reserva]);

    if (!open || !reserva) return null;

    const stars = [1, 2, 3, 4, 5];

    async function handleSave() {
        if (!rating) {
            setError("Selecciona un puntaje de 1 a 5.");
            return;
        }
        if (!user?.ci) {
            setError("No se encontró la cédula del usuario.");
            return;
        }

        try {
            setSaving(true);
            await apiFetch("/resenas/registrar", {
                method: "POST",
                token,
                body: {
                    ci_participante: user.ci,
                    id_reserva: reserva.id_reserva,
                    puntaje_general: rating,
                    descripcion: descripcion || null,
                },
            });
            toast.success("Reseña registrada correctamente.");

            onSaved?.(reserva);
            onClose?.();
        } catch (e) {
            const msg = e.message || "No se pudo registrar la reseña.";
            setError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    }

    return (
        <ResponsiveModal title="Escribir reseña" onClose={onClose} className="max-w-lg rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                        Reseñar sala
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="mb-4 text-sm text-slate-800">
                    <div>
                        <span className="text-slate-600">Sala:</span> {reserva.nombre_sala}
                    </div>
                    <div>
                        <span className="text-slate-600">Edificio:</span> {reserva.edificio}
                    </div>
                    <div>
                        <span className="text-slate-600">Fecha y turno:</span>{" "}
                        {reserva.fecha} · {reserva.hora_inicio}–{reserva.hora_fin}
                    </div>
                </div>

                <div className="mb-4">
                    <p className="mb-2 text-sm text-slate-800">
                        Puntaje general (1 a 5):
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Puntaje general">
                        {stars.map((value) => {
                            const active = value <= rating;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"}`}
                                    aria-pressed={rating === value}
                                    onClick={() => setRating(value)}
                                    className={[
                                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition",
                                        active
                                            ? "border-yellow-400 bg-yellow-400 text-white"
                                            : "border-yellow-400 bg-white text-yellow-400",
                                    ].join(" ")}
                                >
                                    <FaStar className="h-5 w-5" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mb-3">
                    <label className="text-sm">
            <span className="mb-1 block text-slate-800">
              Comentario (opcional)
            </span>
                        <textarea
                            rows={3}
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="¿Algo para destacar de la sala, ruido, comodidad, wifi...?"
                        />
                    </label>
                </div>

                {error && (
                    <div className="mb-2 text-sm text-red-600">{error}</div>
                )}

                <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        {saving ? "Guardando…" : "Guardar reseña"}
                    </button>
                </div>
            
        </ResponsiveModal>
    );
}
