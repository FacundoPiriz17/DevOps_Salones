export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col justify-center items-center min-h-dvh px-4 py-8 bg-gray-100 text-center">
            <h1 className="text-5xl font-bold text-red-600 mb-4">403</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Acceso no autorizado
            </h2>
            <p className="text-gray-600 mb-6">
                No tenés permisos para acceder a esta página.
            </p>
            <a
                href="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
                Volver al inicio
            </a>
        </div>
    );
}
