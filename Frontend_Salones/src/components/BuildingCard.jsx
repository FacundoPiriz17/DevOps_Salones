export default function BuildingCard({
                                         nombre,
                                         direccion,
                                         imageUrl,
                                         onReservar,
                                         onInfo,
                                     }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="aspect-square w-full overflow-hidden bg-slate-100">
                <img
                    src={imageUrl}
                    alt={nombre}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = "/assets/edificios/placeholder.jpg";
                    }}
                />
            </div>

            <div className="p-3 flex-1 flex flex-col">
                <h4 className="text-slate-900 font-semibold">{nombre}</h4>
                <p className="text-xs text-slate-600">{direccion}</p>

                <div className="mt-3 flex gap-2">
                    <button
                        onClick={onReservar}
                        className="flex-1 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        Reservar
                    </button>
                    <button
                        onClick={onInfo}
                        className="flex-1 rounded-xl border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                        Info
                    </button>
                </div>
            </div>
        </div>
    );
}
