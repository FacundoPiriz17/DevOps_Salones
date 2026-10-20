import ResponsiveModal from "./ResponsiveModal";
import React from "react";

export default function ReservationDetailModal({ open, onClose, reserva = {} }) {
    if (!open) return null;

    const { sala, edificio, fecha, turno, participantes = [], capacidad, estado, organizador } = reserva;

    return (
        <ResponsiveModal title="Detalle de reserva" onClose={onClose} className="max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">Detalle de reserva</h3>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="grid gap-1 text-sm text-slate-800">
                    <div><span className="text-slate-600">Sala:</span> {sala}</div>
                    <div><span className="text-slate-600">Edificio:</span> {edificio}</div>
                    <div><span className="text-slate-600">Fecha y turno:</span> {fecha} · {turno}</div>
                    <div><span className="text-slate-600">Capacidad:</span> {capacidad}</div>
                    <div><span className="text-slate-600">Estado:</span> {estado}</div>
                    {organizador && (
                        <div>
                            <span className="text-slate-600">Organiza:</span> {organizador.nombre} (CI {organizador.ci})
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Participantes</h4>
                    <div className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200">
                        {participantes.length === 0 ? (
                            <div className="p-3 text-sm text-slate-600">Sin participantes.</div>
                        ) : (
                            <ul className="divide-y divide-slate-200">
                                {participantes.map((p, idx) => {
                                    const estado = p.estado_confirmacion || "Pendiente";

                                    let badgeClasses = "bg-yellow-100 text-yellow-700";
                                    if (estado === "Confirmado") badgeClasses = "bg-green-100 text-green-700";
                                    else if (estado === "Rechazado") badgeClasses = "bg-red-100 text-red-700";

                                    return (
                                        <li key={idx} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                            <div className="text-sm text-slate-800">
                                                {p.nombre ?? "Participante"} — CI {p.ci}
                                                {p.asistencia && <span className="ml-2 text-xs text-slate-500">({p.asistencia})</span>}
                                            </div>
                                            <span className={["rounded-full px-2 py-0.5 text-xs font-semibold", badgeClasses].join(" ")}>
                        {estado}
                      </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            
        </ResponsiveModal>
    );
}
