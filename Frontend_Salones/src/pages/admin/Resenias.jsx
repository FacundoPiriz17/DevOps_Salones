import { useAuth } from "../../contexts/auth";

import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api.js";
import Footer from "../../components/Footer.jsx";
import ModalEditarResena from "../../components/ModalEditarResenia.jsx";
import ModalEliminar from "../../components/ModalEliminar.jsx";
import Navbar from "../../components/Navbar.jsx";

export default function ReseniasPage() {
  const { token } = useAuth();

  const [resenias, setResenias] = useState([]);

  const [modalEliminar, setModalEliminar] = useState({ open: false, id: null });
  const [modalEditar, setModalEditar] = useState({ open: false, resena: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch("/resenas/all", { token });
        if (!ignore) setResenias(data ?? []);
      } catch (err) {
        setError(err);
        console.error("Fallo /resenas/all:", err);
        if (!ignore) setResenias([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => (ignore = true);
  }, [token]);

  function handleOpenEliminar(id) {
    setModalEliminar({ open: true, id });
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiFetch("/resenas/all", { token });
      setResenias(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-gray-100 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-xl text-blue-800">Cargando Reseñas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-gray-100 to-blue-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-xl shadow-md">
          <p className="text-xl text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-100 to-blue-50 flex flex-col">
      <Navbar />

      <div className="flex min-w-0 flex-col lg:flex-row flex-1 h-full">
        <SidebarAdmin />

        <div className="min-w-0 flex-1 py-6 px-4 sm:py-8 sm:px-6">
          <main className="max-w-5xl mx-auto w-full">
            <div className="flex justify-center items-center px-4 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
                Gestión de Reseñas
              </h2>
            </div>

            <section className="mt-4 px-4">
              <div className="flex flex-col gap-4 px-4">
                {resenias.map((r) => (
                  <div
                    key={r.id_resena}
                    className="
                    group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
                    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
                    transition hover:-translate-y-0.5 hover:border-blue-700 hover:shadow-md
                  "
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                        {r.nombre_sala}
                      </h3>

                      <h3 className="text-xl font-semibold text-blue-900">
                        {r.nombre_completo} ({r.ci_participante})
                      </h3>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < r.puntaje_general
                                ? "text-yellow-500 text-xl"
                                : "text-gray-300 text-xl"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <p className="text-gray-700 -mt-1 mb-2">
                        <span className="font-semibold">Edificio:</span>{" "}
                        {r.edificio}
                      </p>

                      <p className="text-gray-600">
                        <span className="font-semibold">ID_Reserva: </span> #
                        {r.id_reserva}
                      </p>

                      <p className="text-gray-600">
                        <span className="font-semibold">Fecha:</span>{" "}
                        {r.fecha_publicacion}
                      </p>

                      <p className="text-gray-600 break-all whitespace-normal">
                        <span className="font-semibold">Descripción:</span>{" "}
                        {r.descripcion}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                      <button
                        onClick={() => handleOpenEliminar(r.id_resena)}
                        className="px-3 py-1 rounded-lg border border-red-600 text-red-600 hover:bg-red-50 font-medium transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}

                {resenias.length === 0 && (
                  <div className="text-blue-600 text-sm">
                    No hay reseñas registradas.
                  </div>
                )}
              </div>
            </section>

            <ModalEliminar
              open={modalEliminar.open}
              onClose={() => setModalEliminar({ open: false, id: null })}
              objeto="esta reseña"
              onConfirm={async () => {
                await apiFetch(`/resenas/eliminar/${modalEliminar.id}`, {
                  method: "DELETE",
                  token,
                });
                await refresh();
              }}
            />

            <ModalEditarResena
              open={modalEditar.open}
              onClose={() => setModalEditar({ open: false, resena: null })}
              resena={modalEditar.resena}
              token={token}
              onConfirm={async () => refresh()}
            />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
