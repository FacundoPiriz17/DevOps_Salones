import { useAuth } from "../../contexts/auth";
import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../utils/api.js";
import ModalEliminar from "../../components/ModalEliminar.jsx";
import ModalAgregarSala from "../../components/ModalAgregarSala.jsx";
import ModalModificarSala from "../../components/ModalModificarSala.jsx";
import { FaEdit, FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";

export default function SalasPage() {
  const { token } = useAuth();
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalModificar, setModalModificar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [salaSeleccionada, setSalaSeleccionada] = useState(null);
  const [edificios, setEdificios] = useState([]);
  const [edificio, setEdificio] = useState("");
  const [input, setInput] = useState("");
  const [disponibilidad, setDisponibilidad] = useState(true);

  const fetchSalas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/salas/all`, { token });
      setSalas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSalas();
  }, [fetchSalas]);

  const fetchSalasDisp = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/salas/disponibles`, { token });
      setSalas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEdificio = async () => {
      try {
        const data = await apiFetch("/edificios/todos", { token });
        setEdificios(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEdificio();
  }, [token]);

  const fetchSala = async (nombre_sala) => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `/salas/buscar/${encodeURIComponent(nombre_sala)}`,
        { token }
      );
      setSalas(data);
    } catch {
      setSalas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalasEdificio = async (edificioNombre) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/salas/${edificioNombre}`, { token });
      setSalas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      handleBuscarSala();
    }
  };

  const handleBuscarSala = async () => {
    if (input.trim() === "" && edificio === "") {
      fetchSalas();
      return;
    }
    if (input.trim() === "" && edificio !== "") {
      fetchSalasEdificio(edificio);
      return;
    }
    if (input.trim() !== "") {
      fetchSala(input);
      return;
    }
  };

  const handleAgregarSala = async (sala) => {
    try {
      await apiFetch("/salas/registrar", {
        method: "POST",
        body: sala,
        token,
      });
      fetchSalas();
      setModalAgregar(false);
    } catch (err) {
      alert(`Error para agregar sala: ${err.message}`);
    }
  };

  const handleModificarSala = async (datosActualizados) => {
    try {
      await apiFetch(
        `/salas/${encodeURIComponent(salaSeleccionada.nombre_sala)}/${
          salaSeleccionada.edificio
        }`,
        {
          method: "PUT",
          body: datosActualizados,
          token,
        }
      );
      fetchSalas();
      setModalModificar(false);
      setSalaSeleccionada(null);
    } catch (err) {
      alert(`Error al modificar sala: ${err.message}`);
    }
  };

  const handleEliminarSala = async () => {
    try {
      await apiFetch(
        `/salas/${encodeURIComponent(salaSeleccionada.nombre_sala)}/${
          salaSeleccionada.edificio
        }`,
        {
          method: "DELETE",
          token,
        }
      );
      fetchSalas();
      setModalEliminar(false);
      setSalaSeleccionada(null);
    } catch (err) {
      alert(`Error al eliminar sala: ${err.message}`);
    }
  };

  const abrirModalModificar = (sala) => {
    setSalaSeleccionada(sala);
    setModalModificar(true);
  };

  const abrirModalEliminar = (sala) => {
    setSalaSeleccionada(sala);
    setModalEliminar(true);
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-gray-100 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-xl text-blue-800">Cargando Salas...</p>
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
            {/* HEADER / TOOLBAR */}
            <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
                  Listado de Salas
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Administrá las salas y filtrá por edificio o disponibilidad.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                <button
                  onClick={() => setModalAgregar(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
                >
                  + Añadir sala
                </button>
                <button
                  onClick={() => {
                    setDisponibilidad(!disponibilidad);
                    if (disponibilidad) {
                      fetchSalasDisp();
                    } else {
                      fetchSalas();
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50"
                >
                  {disponibilidad ? "Solo disponibles" : "Mostrar todo"}
                </button>
              </div>
            </header>

            <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                placeholder="Buscar sala por nombre..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full sm:max-w-xs px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={edificio}
                onChange={(e) => {
                  const nuevoEdificio = e.target.value;
                  setEdificio(nuevoEdificio);
                  if (nuevoEdificio === "") {
                    fetchSalas();
                  } else {
                    fetchSalasEdificio(nuevoEdificio);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los edificios</option>
                {edificios.map((ed) => (
                  <option
                    key={ed.id_edificio ?? ed.nombre_edificio}
                    value={ed.nombre_edificio}
                  >
                    {ed.nombre_edificio}
                  </option>
                ))}
              </select>
            </section>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={handleBuscarSala}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 shadow text-sm font-semibold"
              >
                Filtrar
              </button>

              <button
                onClick={() => {
                  setInput("");
                  setEdificio("");
                  fetchSalas();
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 shadow text-sm"
              >
                Limpiar filtro
              </button>
            </div>

            {salas.length === 0 ? (
              <div className="text-center text-gray-600 text-lg py-10">
                No hay salas registradas.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {salas.map((sala) => (
                  <div
                    key={`${sala.nombre_sala}-${sala.edificio}`}
                    className="
                    group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm
                    transition hover:-translate-y-0.5 hover:border-blue-700 hover:shadow-md
                "
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {sala.nombre_sala}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">
                          Edificio: {sala.edificio}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-xs sm:text-sm">
                        {sala.disponible ? (
                          <div className="flex items-center gap-1 text-blue-700">
                            <FaCheckCircle
                              className="text-base sm:text-lg"
                              title="Disponible"
                            />
                            <span>Disponible</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <FaTimesCircle
                              className="text-base sm:text-lg"
                              title="No disponible"
                            />
                            <span>Ocupada</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 mb-3 text-xs sm:text-sm text-slate-700">
                      <p>
                        <span className="font-semibold">Capacidad:</span>{" "}
                        {sala.capacidad} personas
                      </p>
                      <p>
                        <span className="font-semibold">Tipo:</span>{" "}
                        {sala.tipo_sala}
                      </p>
                      <p>
                        <span className="font-semibold">Equipamiento:</span>{" "}
                        {sala.equipamiento || "No especificado"}
                      </p>
                      <p>
                        <span className="font-semibold">Puntaje:</span>{" "}
                        {sala.puntaje}/5 ⭐
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => abrirModalModificar(sala)}
                        className="min-w-0 flex-1 min-w-[120px] rounded-lg bg-blue-700 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 flex items-center justify-center gap-2"
                      >
                        <FaEdit /> Editar
                      </button>

                      <button
                        onClick={() => abrirModalEliminar(sala)}
                        className="min-w-0 flex-1 min-w-[120px] rounded-lg border border-red-600 px-3 py-2 text-xs sm:text-sm font-semibold text-red-600 bg-white hover:bg-red-50 flex items-center justify-center gap-2"
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />

      <ModalAgregarSala
        open={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onConfirm={handleAgregarSala}
        edificios={edificios}
      />

      <ModalModificarSala
        open={modalModificar}
        onClose={() => {
          setModalModificar(false);
          setSalaSeleccionada(null);
        }}
        onConfirm={handleModificarSala}
        sala={salaSeleccionada}
      />

      <ModalEliminar
        open={modalEliminar}
        onClose={() => {
          setModalEliminar(false);
          setSalaSeleccionada(null);
        }}
        onConfirm={handleEliminarSala}
        objeto={`la sala "${salaSeleccionada?.nombre_sala}" del edificio ${salaSeleccionada?.edificio}`}
      />
    </div>
  );
}
