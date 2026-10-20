import { useAuth } from "../../contexts/auth";
import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api.js";
import ModalEliminarSancion from "../../components/ModalEliminar.jsx";
import ModalEditarSancion from "../../components/ModalEditarSancion.jsx";
import ModalEliminar from "../../components/ModalEliminar.jsx";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";

export default function SancionesPage() {
  const [sanciones, setSanciones] = useState([]);
  const { token } = useAuth();

  const [modalEliminar, setModalEliminar] = useState({ open: false, id: null });
  const [modalEditar, setModalEditar] = useState({
    open: false,
    sancion: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch("/sanciones/all", { token });
        if (!ignore) setSanciones(data ?? []);
      } catch (err) {
        setError(err);
        console.error("Fallo /sanciones/all:", err);
        if (!ignore) setSanciones([]);
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

  function handleOpenEditar(sancion) {
    setModalEditar({ open: true, sancion });
  }
  function handleOpenAniadir() {
    setModalEditar({ open: true, sancion: null });
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiFetch("/sanciones/all", { token });
      setSanciones(data ?? []);
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
          <p className="text-xl text-blue-800">Cargando Sanciones...</p>
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
            <div className="flex justify-between items-center px-4 mb-6">
              <h2 className="text-3xl font-bold text-blue-800">
                Gestión de Sanciones
              </h2>

              <button
                onClick={handleOpenAniadir}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 shadow"
              >
                Añadir sanción
              </button>
            </div>

            <div className="flex flex-col gap-4 px-4">
              {sanciones.map((s) => (
                <div
                  key={s.id_sancion}
                  className="
          group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
          flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
          transition hover:-translate-y-0.5 hover:border-blue-700 hover:shadow-md
        "
                >
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Nombre: {s.nombre_completo ?? "Desconocido"}
                    </h3>

                    <p className="text-slate-600 -mt-1 mb-2">
                      <span className="font-semibold">
                        CI: {s.ci_participante}
                      </span>
                    </p>

                    <p className="text-gray-600 mt-1">
                      <span className="font-semibold">Motivo:</span> {s.motivo}
                    </p>

                    <p className="text-gray-600">
                      <span className="font-semibold">Inicio:</span>{" "}
                      {s.fecha_inicio}
                    </p>

                    <p className="text-gray-600">
                      <span className="font-semibold">Fin:</span> {s.fecha_fin}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditar(s)}
                      className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleOpenEliminar(s.id_sancion)}
                      className="text-xs sm:text-sm px-3 py-1 rounded-lg border border-red-600 text-red-600 hover:bg-red-50 font-medium transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {sanciones.length === 0 && (
                <div className="text-gray-600 text-sm">
                  No hay sanciones registradas.
                </div>
              )}
            </div>

            <ModalEliminar
              open={modalEliminar.open}
              onClose={() => setModalEliminar({ open: false, id: null })}
              objeto="esta sanción"
              onConfirm={async () => {
                await apiFetch(`/sanciones/eliminar/${modalEliminar.id}`, {
                  method: "DELETE",
                  token,
                });
                await refresh();
              }}
            />

            <ModalEditarSancion
              open={modalEditar.open}
              onClose={() => setModalEditar({ open: false, sancion: null })}
              sancion={modalEditar.sancion}
              token={token}
              onConfirm={async () => {
                await refresh();
              }}
              titulo={modalEditar.sancion ? "Editar sanción" : "Añadir sanción"}
            />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
