import { FaStar } from "react-icons/fa";

export default function ReviewCard({ reserva, onReview }) {
    const { nombre_sala, edificio, fecha, hora_inicio, hora_fin } = reserva;

    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                            {nombre_sala}
                        </h3>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              {edificio}
            </span>
                    </div>

                    <p className="text-xs text-slate-600 sm:text-sm">
                        {fecha} · {hora_inicio}–{hora_fin}
                    </p>

                    <p className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                        <FaStar className="h-3 w-3" />
                        Reseña pendiente
                    </p>
                </div>

                <button
                    onClick={() => onReview?.(reserva)}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 focus:ring-offset-white"
                >
                    Reseñar
                </button>
            </div>
        </div>
    );
}
