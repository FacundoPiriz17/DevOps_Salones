import { useAuth } from "../../contexts/auth";

import { useCallback, useEffect, useState } from "react";

import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import { apiFetch } from "../../utils/api.js";
import ReservationCard from "../../components/ReservationCard.jsx";
import ReservationDetailModal from "../../components/ReservationDetailModal.jsx";
import ReservaModal from "../../components/ReservaModal.jsx";
import ModalEliminar from "../../components/ModalEliminar.jsx";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import ReservationManageModal from "../../components/ReservationManageModal.jsx";

export default function ReservasPage() {
  const { token } = useAuth();

  const [reservas, setReservas] = useState([]);

  const [modalVer, setModalVer] = useState({ open: false, reserva: null });
  const [modalEditar, setModalEditar] = useState({
    open: false,
    reserva: null,
  });
  const [modalAgregar, setModalAgregar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState({ open: false, id: null });
  const [modalGestion, setModalGestion] = useState({
    open: false,
    reserva: null,
  });
  const [loading, setLoading] = useState(false);

  const fetchAllAndDetalle = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetch("/reservas/all", { token });
      if (!Array.isArray(list)) {
        setReservas([]);
        return;
      }
      const detalles = await Promise.all(
        list.map(async (r) => {
          try {
            const det = await apiFetch(`/reservas/detalle/${r.id_reserva}`, {
              token,
            });
            return {
              ...r,
              id_reserva: r.id_reserva,
              nombre_sala: det.nombre_sala,
              sala: det.nombre_sala,
              edificio: det.edificio,
              fecha:
                typeof det.fecha === "string"
                  ? det.fecha
                  : String(det.fecha).slice(0, 10),
              id_turno: det.id_turno,
              turno: `${det.hora_inicio} · ${det.hora_fin}`,
              estado: det.estado,
              organizador: {
                ci: det.ci_organizador,
                nombre: det.nombre_organizador,
                apellido: det.apellido_organizador,
              },
              participantes: Array.isArray(det.participantes)
                ? det.participantes.length
                : 0,
              capacidad: det.capacidad ?? 0,
              detalle_full: det,
            };
          } catch {
            return {
              ...r,
              id_reserva: r.id_reserva,
              sala: r.nombre_sala,
              edificio: r.edificio,
              fecha: r.fecha ? String(r.fecha).slice(0, 10) : "",
              turno: r.id_turno,
              organizador: { ci: r.ci_organizador },
              participantes: 0,
              capacidad: 0,
              detalle_full: null,
            };
          }
        })
      );
      setReservas(detalles);
    } catch (err) {
      console.error("Error cargando reservas:", err);
      setReservas([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllAndDetalle();
  }, [fetchAllAndDetalle]);

  async function refresh() {
    await fetchAllAndDetalle();
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-gray-100 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-xl text-blue-800">Cargando Reservas...</p>
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
          <main className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
                Gestión de Reservas
              </h2>
              <button
                onClick={() => setModalAgregar(true)}
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Añadir reserva
              </button>
            </div>

            <div className="flex flex-col gap-4 px-4">
              {reservas.length === 0 && (
                <div className="text-gray-600 text-sm">
                  No hay reservas registradas.
                </div>
              )}
              {reservas.map((r) => (
                <ReservationCard
                  key={r.id_reserva}
                  reserva={r}
                  isAdmin={true}
                  isOrganizer={false}
                  onView={(res) => setModalVer({ open: true, reserva: res })}
                  onEdit={(res) => setModalEditar({ open: true, reserva: res })}
                  onDelete={(res) =>
                    setModalEliminar({ open: true, id: res.id_reserva })
                  }
                  onManage={(res) =>
                    setModalGestion({ open: true, reserva: res })
                  }
                />
              ))}
            </div>

            <ReservationDetailModal
              open={modalVer.open}
              onClose={() => setModalVer({ open: false, reserva: null })}
              reserva={modalVer.reserva?.detalle_full ?? modalVer.reserva}
            />

            <ReservaModal
              open={modalAgregar}
              onClose={() => setModalAgregar(false)}
              token={token}
              modo="agregar"
              isAdmin={true}
              onConfirm={async () => {
                setModalAgregar(false);
                await refresh();
              }}
            />

            <ReservaModal
              open={modalEditar.open}
              onClose={() => setModalEditar({ open: false, reserva: null })}
              reserva={modalEditar.reserva?.detalle_full ?? modalEditar.reserva}
              token={token}
              modo="editar"
              isAdmin={true}
              onConfirm={async () => {
                setModalEditar({ open: false, reserva: null });
                await refresh();
              }}
            />

            <ModalEliminar
              open={modalEliminar.open}
              onClose={() => setModalEliminar({ open: false, id: null })}
              objeto="esta reserva"
              onConfirm={async () => {
                console.log("ID que se intenta eliminar:", modalEliminar.id);

                try {
                  await apiFetch(`/reservas/eliminar/${modalEliminar.id}`, {
                    method: "DELETE",
                    token,
                  });
                } catch (e) {
                  console.error("Error eliminando reserva:", e);
                }
                setModalEliminar({ open: false, id: null });
                await refresh();
              }}
            />

            <ReservationManageModal
              open={modalGestion.open}
              onClose={() => setModalGestion({ open: false, reserva: null })}
              reserva={modalGestion.reserva}
              token={token}
              onUpdated={refresh}
            />
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
