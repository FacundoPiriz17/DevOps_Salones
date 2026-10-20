import { useAuth } from "../../contexts/auth";
import { useNavigate } from "react-router-dom";
import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api.js";
import ModalEliminar from "../../components/ModalEliminar.jsx";
import ModalEditarUsuario from "../../components/ModalEditarUsuario.jsx";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";

export default function UsuariosPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);

  const [modalEliminar, setModalEliminar] = useState({ open: false, ci: null });
  const [modalEditar, setModalEditar] = useState({
    open: false,
    usuario: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch("/login/usuarios", { token });
        if (!ignore) setUsuarios(data ?? []);
      } catch (err) {
        console.error("Fallo /login/usuarios:", err);
        if (!ignore) setUsuarios([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => (ignore = true);
  }, [token]);

  function handleOpenEliminar(ci) {
    setModalEliminar({ open: true, ci });
  }

  function handleOpenEditar(usuarioBasico) {
    setModalEditar({ open: true, usuario: null });

    (async () => {
      try {
        const usuarioCompleto = await apiFetch(
          `/login/usuarios/${usuarioBasico.ci}`,
          { token }
        );
        setModalEditar({ open: true, usuario: usuarioCompleto });
      } catch (err) {
        console.error("Fallo /login/usuarios/<ci>:", err);
        setModalEditar({ open: false, usuario: null });
      }
    })();
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await apiFetch("/login/usuarios", { token });
      setUsuarios(data ?? []);
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
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-slate-200 to-blue-100">
      <Navbar />

      <div className="flex min-w-0 flex-col lg:flex-row flex-1">
        <SidebarAdmin />

        <main className="min-w-0 flex-1 flex justify-center overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-6 sm:py-8">
          <div className="w-full max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-1 sm:px-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-800 text-center sm:text-left">
                  Gestión de Usuarios
                </h2>

                <div className="flex justify-center sm:justify-end">
                  <button
                    onClick={() => navigate("/registro")}
                    className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 shadow text-sm sm:text-base"
                  >
                    Añadir usuario
                  </button>
                </div>
              </div>
            </header>

            <section className="space-y-4 px-1 sm:px-0 pb-6">
              {usuarios.map((u) => (
                <article
                  key={u.ci}
                  className="
                    group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm
                    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4
                    transition hover:-translate-y-0.5 hover:border-blue-700 hover:shadow-md
                  "
                >
                  <div className="min-w-0 flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-blue-800 break-words">
                      {u.nombre} {u.apellido}
                    </h3>

                    <p className="text-gray-700 -mt-1 mb-1 text-sm sm:text-base">
                      <span className="font-semibold">CI:</span> {u.ci}
                    </p>

                    <p className="text-gray-600 text-sm sm:text-base break-all">
                      <span className="font-semibold">Email:</span> {u.email}
                    </p>

                    <p className="text-gray-600 text-sm sm:text-base">
                      <span className="font-semibold">Rol:</span> {u.rol}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                    <button
                      onClick={() => handleOpenEditar(u)}
                      className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleOpenEliminar(u.ci)}
                      className="text-xs sm:text-sm px-3 py-1 rounded-lg border border-red-600 text-red-600 hover:bg-red-50 font-medium transition"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}

              {usuarios.length === 0 && (
                <div className="text-gray-600 text-sm text-center bg-white/70 rounded-xl py-4">
                  No hay usuarios registrados.
                </div>
              )}
            </section>

            <ModalEliminar
              open={modalEliminar.open}
              onClose={() => setModalEliminar({ open: false, ci: null })}
              objeto="este usuario"
              onConfirm={async () => {
                await apiFetch(`/login/usuarios/${modalEliminar.ci}`, {
                  method: "DELETE",
                  token,
                });
                await refresh();
              }}
            />

            <ModalEditarUsuario
              open={modalEditar.open}
              onClose={() => setModalEditar({ open: false, usuario: null })}
              usuario={modalEditar.usuario}
              token={token}
              onConfirm={async () => {
                await refresh();
              }}
              titulo={modalEditar.usuario ? "Editar usuario" : "Añadir usuario"}
            />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
