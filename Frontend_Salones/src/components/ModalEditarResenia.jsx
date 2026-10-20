import ResponsiveModal from "./ResponsiveModal";
import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

export default function ModalEditarResena({ open, onClose, resena, token, onConfirm }) {


    const [ci, setCi] = useState("");
    const [reserva, setReserva] = useState("");
    const [puntaje, setPuntaje] = useState(5);
    const [descripcion, setDescripcion] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setError("");

        if (resena) {
            setCi(resena.ci_participante);
            setReserva(resena.id_reserva);
            setPuntaje(resena.puntaje_general);
            setDescripcion(resena.descripcion || "");
        } else {
            setCi("");
            setReserva("");
            setPuntaje(5);
            setDescripcion("");
        }
    }, [resena, open]);

    async function handleSave() {
        try {
            const body = {
                ci_participante: ci,
                id_reserva: reserva,
                puntaje_general: puntaje,
                descripcion,
            };

            if (resena) {
                await apiFetch(`/resenas/modificar/${resena.id_resena}`, {
                    method: "PUT",
                    token,
                    body,
                });
            } else {
                await apiFetch(`/resenas/registrar`, {
                    method: "POST",
                    token,
                    body,
                });
            }

            onClose();
            await onConfirm();

        } catch (err) {
            console.error("Error guardando reseña", err);

            let parsed = {};
            try {
                parsed = JSON.parse(err.message);
            } catch {
                setError("Error inesperado al guardar la reseña.");
                return;
            }

            const mensaje = (parsed.error || "").toLowerCase();

            if (parsed.status === 401) {
                setError("Tu sesión expiró. Inicia sesión nuevamente.");
                return;
            }

            if (parsed.status === 403) {
                setError("No tienes permisos para realizar esta acción.");
                return;
            }

            if (mensaje.includes("foreign key")) {
                setError("La cédula o la reserva no existen.");
            }
            else if (mensaje.includes("puntaje")) {
                setError("El puntaje debe estar entre 1 y 5.");
            }
            else if (
                mensaje.includes("datos") ||
                mensaje.includes("faltan") ||
                mensaje.includes("required")
            ) {
                setError("Faltan datos requeridos.");
            }
            else {
                setError(parsed.error || "Error al guardar la reseña.");
            }
        }
    }


    if (!open) return null;

    return (
        <ResponsiveModal title="Editar reseña" onClose={onClose} className="max-w-lg rounded-2xl bg-white p-5 shadow-xl">

                <h2 className="text-xl font-semibold text-blue-800">
                    Editar Reseña
                </h2>

                <div className="mt-4 space-y-3">

                    <div>
                        <label className="text-sm font-semibold">Cédula</label>
                        <input
                            type="text"
                            className="w-full border px-2 py-1 rounded"
                            value={ci}
                            onChange={(e) => setCi(e.target.value.replace(/\D/g, ""))}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">ID Reserva</label>
                        <input
                            type="number"
                            className="w-full border px-2 py-1 rounded"
                            value={reserva}
                            onChange={(e) => setReserva(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Puntaje</label>
                        <select
                            className="w-full border px-2 py-1 rounded"
                            value={puntaje}
                            onChange={(e) => setPuntaje(parseInt(e.target.value))}
                        >
                            {[1,2,3,4,5].map(n => (
                                <option key={n} value={n}>{n} ★</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Descripción</label>
                        <textarea
                            className="w-full border px-2 py-1 rounded"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-red-600 text-sm font-semibold mt-2">{error}</p>
                    )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="px-4 py-1 rounded bg-gray-300 hover:bg-gray-400"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        className="px-4 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white"
                    >
                        Guardar
                    </button>
                </div>

            
        </ResponsiveModal>
    );
}
