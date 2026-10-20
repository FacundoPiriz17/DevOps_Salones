import { FaTimes, FaCheck } from "react-icons/fa";

export default function NotificationsDropdown({
                                                  open,
                                                  onClose,
                                                  items = [],
                                                  onAccept,
                                                  onReject,
                                                  loading = false,
                                              }) {
    if (!open) return null;

    return (
        <div
            id="notifications-panel"
            className="fixed left-3 right-3 top-20 z-50 rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800">Notificaciones</h4>
                <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    aria-label="Cerrar notificaciones"
                >
                    <FaTimes size={12} className="text-slate-600" />
                </button>
            </div>

            <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain">
                {loading && (
                    <div className="p-4 text-sm text-slate-600">Cargando…</div>
                )}
                {!loading && items.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">
                        No tienes notificaciones pendientes.
                    </div>
                )}
                {!loading &&
                    items.map((n) => (
                        <div
                            key={n.id}
                            className="px-4 py-3 border-b last:border-0 border-slate-100"
                        >
                            <div className="text-sm font-medium text-slate-800">
                                Invitación a reserva
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                                {n.descripcion ?? `${n.sala} · ${n.edificio} · ${n.fecha} ${n.turno}`}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => onAccept?.(n)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <FaCheck size={10} /> Aceptar
                                </button>
                                <button
                                    onClick={() => onReject?.(n)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-700 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
