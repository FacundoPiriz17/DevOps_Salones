import ResponsiveModal from "./ResponsiveModal";
import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

function formatDateForInput(fecha) {
    if (!fecha) return "";
    const d = new Date(fecha);

    if (Number.isNaN(d.getTime())) {
        console.warn("Fecha inválida recibida en sanción:", fecha);
        return "";
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export default function ModalEditarSancion({
                                               open,
                                               onClose,
                                               sancion,
                                               titulo,
                                               token,
                                               onConfirm,
                                           }) {
    const [ci, setCi] = useState("");
    const [motivo, setMotivo] = useState("");
    const [inicio, setInicio] = useState("");
    const [fin, setFin] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setError("");

        if (!open) return;

        if (sancion) {
            setCi(sancion.ci_participante ?? "");
            setMotivo(sancion.motivo ?? "Uso indebido");
            setInicio(formatDateForInput(sancion.fecha_inicio));
            setFin(formatDateForInput(sancion.fecha_fin));
        } else {
            setCi("");
            setMotivo("Uso indebido");
            setInicio("");
            setFin("");
        }
    }, [sancion, open]);

    async function handleSave() {
        try {
            const body = {
                ci_participante: ci,
                motivo,
                fecha_inicio: inicio,
                fecha_fin: fin,
            };

            if (sancion) {
                await apiFetch(`/sanciones/modificar/${sancion.id_sancion}`, {
                    method: "PUT",
                    token,
                    body,
                });
            } else {
                await apiFetch(`/sanciones/registrar`, {
                    method: "POST",
                    token,
                    body,
                });
            }

            onClose();
            await onConfirm();
        } catch (err) {
            console.error("Hubo un error :( ", err);

            let mensaje = "";

            try {
                const parsed = JSON.parse(err.message);
                mensaje = (parsed.error || "").toLowerCase();
            } catch {
                mensaje = err.message?.toLowerCase() || "";
            }

            if (mensaje.includes("cédula inválida") || mensaje.includes("cedula invalida")) {
                setError("Cédula inválida");
            } else if (mensaje.includes("ya tiene una sanción") || mensaje.includes("activa")) {
                setError("El participante ya está sancionado en esa fecha");
            } else if (mensaje.includes("faltan datos")) {
                setError("Faltan datos requeridos");
            } else if (
                mensaje.includes("fecha de fin") ||
                mensaje.includes("posterior a la de inicio")
            ) {
                setError("La fecha de fin debe ser posterior a la de inicio");
            } else {
                setError("Error al procesar la sanción");
            }
        }
    }

    if (!open) return null;

    return (
        <ResponsiveModal title="Editar sanción" onClose={onClose} className="max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                <h2 className="text-xl font-semibold text-blue-800">{titulo}</h2>

                <div className="mt-4 space-y-3">
                    <div>
                        <label className="text-sm font-semibold">Cédula</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full border px-2 py-1 rounded"
                            value={ci}
                            onChange={(e) =>
                                setCi(e.target.value.replace(/\D/g, ""))
                            }
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Motivo</label>
                        <select
                            className="w-full border px-2 py-1 rounded"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                        >
                            <option>Uso indebido</option>
                            <option>Morosidad</option>
                            <option>Vandalismo</option>
                            <option>Inasistencia</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Fecha inicio</label>
                        <input
                            type="date"
                            className="w-full border px-2 py-1 rounded"
                            value={inicio}
                            onChange={(e) => setInicio(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Fecha fin</label>
                        <input
                            type="date"
                            className="w-full border px-2 py-1 rounded"
                            value={fin}
                            onChange={(e) => setFin(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-red-600 text-sm font-semibold mt-2">
                            {error}
                        </p>
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