import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ReservationCard from "../../components/ReservationCard";
import BuildingsGrid from "../../components/BuildingsGrid";
import ReservationDetailModal from "../../components/ReservationDetailModal";
import InvitacionModal from "../../components/InvitacionModal";
import ResenaModal from "../../components/ResenaModal";
import ReviewCard from "../../components/ReviewCard";
import { useAuth } from "../../contexts/auth";
import { apiFetch } from "../../utils/api";
import { toast } from "react-toastify";

function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  const d = new Date(fechaStr);
  if (Number.isNaN(d.getTime())) return fechaStr;
  return d.toLocaleDateString("es-UY", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ParticipantePage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState("MIS");
  const [misReservas, setMisReservas] = useState([]);
  const [misInvitaciones, setInvitaciones] = useState([]);
  const [invConfirmadas, setConfirmadas] = useState([]);
  const [organizo, setOrganizo] = useState([]);
  const [detail, setDetail] = useState({ open: false, reserva: null });
  const [invite, setInvite] = useState({ open: false, id: null });

  const [pendientesResena, setPendientesResena] = useState([]);
  const [review, setReview] = useState({ open: false, reserva: null });

  const [reloadFlag, setReloadFlag] = useState(0);
  const triggerReload = () => setReloadFlag((f) => f + 1);

  useEffect(() => {
    let ignore = false;
    if (!user?.ci) return;

    const ci = Number(user.ci);
    if (!ci || isNaN(ci)) return;

    async function load() {
      try {
        const data = await apiFetch(`/reservas/cedula?ci=${ci}`, { token });
        if (ignore) return;

        const raw = Array.isArray(data) ? data : [];

        const mapped = raw
          .filter((r) => r.estado === "Activa")
          .map((r) => {
            const soyOrganizador =
              r.soyOrganizador === 1 || r.soyOrganizador === true;

            return {
              id_reserva: r.id_reserva,
              sala: r.nombre_sala,
              edificio: r.edificio,
              fecha: formatFecha(r.fecha),
              turno: `${r.hora_inicio}–${r.hora_fin}`,
              participantes: r.cantidad_participantes ?? 0,
              capacidad: r.capacidad ?? 0,
              estado: r.estado,
              soyOrganizador,
              confirmacion: r.confirmacion,
              asistencia: r.asistencia,
              organiza: `${r.nombre_organizador} ${r.apellido_organizador}`,
            };
          })
          .filter(
            (r) =>
              r.soyOrganizador ||
              (r.confirmacion && r.confirmacion === "Confirmado")
          );

        setMisReservas(mapped);
      } catch (e) {
        if (!ignore) {
          setMisReservas([]);
          toast.error(e.message || "No se pudieron cargar tus reservas.");
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, user?.ci, reloadFlag]);

  useEffect(() => {
    let ignore = false;
    if (tab !== "INVITAR") return;
    if (!user?.ci) return;

    const ci = Number(user.ci);
    if (!ci || isNaN(ci)) return;

    async function load() {
      try {
        const data = await apiFetch(`/reservas/cedula?ci=${ci}`, { token });
        if (ignore) return;

        const raw = Array.isArray(data) ? data : [];

        const mapped = raw
          .filter((r) => r.estado === "Activa")
          .map((r) => {
            const soyOrganizador =
              r.soyOrganizador === 1 || r.soyOrganizador === true;

            return {
              id_reserva: r.id_reserva,
              sala: r.nombre_sala,
              edificio: r.edificio,
              fecha: formatFecha(r.fecha),
              turno: `${r.hora_inicio}–${r.hora_fin}`,
              participantes: r.cantidad_participantes ?? 0,
              capacidad: r.capacidad ?? 0,
              estado: r.estado,
              soyOrganizador,
              organiza: `${r.nombre_organizador} ${r.apellido_organizador}`,
            };
          });

        const soloOrganizo = mapped.filter((r) => r.soyOrganizador);
        setOrganizo(soloOrganizo);
      } catch (e) {
        if (!ignore) {
          setOrganizo([]);
          toast.error(
            e.message || "No se pudieron cargar las reservas que organizas."
          );
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [tab, token, user?.ci, reloadFlag]);

  useEffect(() => {
    let ignore = false;
    if (tab !== "RESENAR") return;
    if (!user?.ci) return;

    async function load() {
      try {
        const data = await apiFetch("/reservas/para-resenar", { token });
        if (!ignore) setPendientesResena(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setPendientesResena([]);
        toast.error(
          e.message || "No se pudieron cargar las reservas para reseñar."
        );
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [tab, token, user?.ci]);

  useEffect(() => {
    let ignore = false;
    if (tab !== "MISINV") return;
    if (!user?.ci) return;

    const ci = Number(user.ci);
    if (!ci || isNaN(ci)) return;

    async function load() {
      try {
        const dataPendientes = await apiFetch(
          "/reservas/invitaciones?estado=pendiente",
          { token }
        );

        const dataConfirmadas = await apiFetch(
          "/reservas/invitaciones?estado=confirmada",
          { token }
        );

        const dataRechazadas = await apiFetch(
          "/reservas/invitaciones?estado=rechazada",
          { token }
        );

        if (ignore) return;

        const rawPendientes = Array.isArray(dataPendientes)
          ? dataPendientes
          : [];
        const rawConfirmadas = Array.isArray(dataConfirmadas)
          ? dataConfirmadas
          : [];
        const rawRechazadas = Array.isArray(dataRechazadas)
          ? dataRechazadas
          : [];

        const mappedPendientes = rawPendientes.map((inv) => ({
          id_reserva: inv.reservaId,
          sala: inv.sala,
          edificio: inv.edificio,
          fecha: formatFecha(inv.fecha),
          turno: inv.turno,
          confirmacion: inv.confirmacion,
        }));

        const mappedConfirmadas = rawConfirmadas.map((inv) => ({
          id_reserva: inv.reservaId,
          sala: inv.sala,
          edificio: inv.edificio,
          fecha: formatFecha(inv.fecha),
          turno: inv.turno,
          confirmacion: inv.confirmacion,
        }));

        const mappedRechazadas = rawRechazadas.map((inv) => ({
          id_reserva: inv.reservaId,
          sala: inv.sala,
          edificio: inv.edificio,
          fecha: formatFecha(inv.fecha),
          turno: inv.turno,
          confirmacion: inv.confirmacion,
        }));

        setInvitaciones(mappedPendientes);
        setConfirmadas([...mappedConfirmadas, ...mappedRechazadas]);
      } catch (e) {
        if (!ignore) {
          setInvitaciones([]);
          setConfirmadas([]);
          toast.error(e.message || "No se pudieron cargar las invitaciones.");
        }
      }
    }
    load();

    return () => {
      ignore = true;
    };
  }, [token, tab, user?.ci, reloadFlag]);

  const actualizarInvitacion = (inv, nuevaConfirmacion) => {
    const actualizada = { ...inv, confirmacion: nuevaConfirmacion };

    setInvitaciones((prev) =>
      prev.filter((r) => r.id_reserva !== inv.id_reserva)
    );

    setConfirmadas((prev) => {
      const yaExiste = prev.some((r) => r.id_reserva === inv.id_reserva);
      if (yaExiste) {
        return prev.map((r) =>
          r.id_reserva === inv.id_reserva ? actualizada : r
        );
      }
      return [actualizada, ...prev];
    });
  };

  const handleAceptarInvitacion = async (inv) => {
    try {
      await apiFetch(`/reservas/confirmacion/${inv.id_reserva}`, {
        method: "PATCH",
        body: { confirmacion: "Confirmado" },
        token,
      });

      actualizarInvitacion(inv, "Confirmado");
      triggerReload();

      toast.success("Invitación aceptada correctamente.");
    } catch (e) {
      toast.error(e.message || "No se pudo aceptar la invitación.");
    }
  };

  const handleRechazarInvitacion = async (inv) => {
    try {
      await apiFetch(`/reservas/confirmacion/${inv.id_reserva}`, {
        method: "PATCH",
        body: { confirmacion: "Rechazado" },
        token,
      });

      actualizarInvitacion(inv, "Rechazado");
      triggerReload();

      toast.success("Invitación rechazada.");
    } catch (e) {
      toast.error(e.message || "No se pudo rechazar la invitación.");
    }
  };

  async function handleCancel(reserva) {
    try {
      await apiFetch(`/reservas/cancelar/${reserva.id_reserva}`, {
        method: "PATCH",
        token,
      });
      setMisReservas((prev) =>
        prev.filter((r) => r.id_reserva !== reserva.id_reserva)
      );
      setOrganizo((prev) =>
        prev.filter((r) => r.id_reserva !== reserva.id_reserva)
      );
      triggerReload();
      toast.success("Reserva cancelada correctamente.");
    } catch (e) {
      toast.error(e.message || "No se pudo cancelar la reserva.");
    }
  }

  async function handleLeave(reserva) {
    try {
      await apiFetch(`/reservas/salir/${reserva.id_reserva}`, {
        method: "DELETE",
        token,
      });
      setMisReservas((prev) =>
        prev.filter((r) => r.id_reserva !== reserva.id_reserva)
      );
      triggerReload();
      toast.success("Saliste de la reserva correctamente.");
    } catch (e) {
      toast.error(e.message || "No se pudo salir de la reserva.");
    }
  }

  async function openDetail(reserva) {
    try {
      const full = await apiFetch(`/reservas/detalle/${reserva.id_reserva}`, {
        token,
      });
      const mapped = {
        sala: full.nombre_sala,
        edificio: full.edificio,
        fecha: full.fecha,
        turno: `${full.hora_inicio}–${full.hora_fin}`,
        capacidad: full.capacidad,
        estado: full.estado,
        organizador: {
          ci: full.ci_organizador,
          nombre: `${full.nombre_organizador} ${full.apellido_organizador}`,
        },
        participantes: full.participantes || [],
      };
      setDetail({ open: true, reserva: mapped });
    } catch (e) {
      toast.error(e.message || "No se pudo cargar el detalle de la reserva.");
    }
  }

  function handleReviewSaved(reserva) {
    setPendientesResena((prev) =>
      prev.filter((r) => r.id_reserva !== reserva.id_reserva)
    );
  }

  const tabs = useMemo(
    () => [
      { key: "MIS", label: "Mis reservas" },
      { key: "HACER", label: "Hacer reserva" },
      { key: "MISINV", label: "Mis Invitaciones" },
      { key: "INVITAR", label: "Invitar" },
      { key: "RESENAR", label: "Reseñar" },
    ],
    []
  );

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar onInvitationsChanged={triggerReload} />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <header className="mb-5">
            <h1 className="text-2xl font-bold text-blue-950 sm:text-3xl">Tus salas de estudio</h1>
            <p className="mt-1 text-sm text-slate-600">Gestioná tus reservas, invitaciones y reseñas.</p>
          </header>
          <div className="mb-6">
            <nav aria-label="Reservas y participación" className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:flex sm:flex-wrap sm:w-fit">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition",
                    tab === t.key
                      ? "bg-white text-blue-700 shadow-sm"
                      : "bg-transparent text-slate-600 hover:bg-white/70 hover:text-blue-700",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {tab === "MIS" && (
            <div className="grid gap-3">
              {misReservas.map((r) => (
                <ReservationCard
                  key={r.id_reserva}
                  reserva={r}
                  isOrganizer={r.soyOrganizador}
                  onView={() => openDetail(r)}
                  onCancel={handleCancel}
                  onLeave={handleLeave}
                  onInvite={() => setInvite({ open: true, id: r.id_reserva })}
                />
              ))}
              {misReservas.length === 0 && (
                <div className="text-sm text-slate-600">
                  No tienes reservas por ahora.
                </div>
              )}
            </div>
          )}

          {tab === "HACER" && <BuildingsGrid onReservaCreada={triggerReload} />}

          {tab === "MISINV" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  Invitaciones Pendientes ({misInvitaciones.length})
                </h2>

                <div className="grid gap-3">
                  {misInvitaciones.map((inv) => (
                    <div
                      key={inv.id_reserva}
                      className="rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {inv.sala} - {inv.edificio}
                          </h3>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-slate-600">
                              Fecha: {inv.fecha}
                            </p>
                            <p className="text-sm text-slate-600">
                              Turno: {inv.turno}
                            </p>
                            <p className="text-sm font-medium text-amber-600">
                              Estado: Pendiente
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:flex-col">
                          <button
                            onClick={() => handleAceptarInvitacion(inv)}
                            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
                          >
                            ✓ Aceptar
                          </button>
                          <button
                            onClick={() => handleRechazarInvitacion(inv)}
                            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                          >
                            ✗ Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {misInvitaciones.length === 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="text-slate-600">
                        No tienes invitaciones pendientes.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  Invitaciones Confirmadas/Rechazadas ({invConfirmadas.length})
                </h2>

                <div className="grid gap-3">
                  {invConfirmadas.map((inv) => {
                    const isConfirmada = inv.confirmacion === "Confirmado";
                    const borderColor = isConfirmada
                      ? "border-green-300"
                      : "border-red-300";
                    const bgColor = isConfirmada ? "bg-green-50" : "bg-red-50";
                    const textColor = isConfirmada
                      ? "text-green-600"
                      : "text-red-600";

                    return (
                      <div
                        key={inv.id_reserva}
                        className={`rounded-lg border ${borderColor} ${bgColor} p-4 shadow-sm`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {inv.sala} - {inv.edificio}
                            </h3>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-slate-600">
                                Fecha: {inv.fecha}
                              </p>
                              <p className="text-sm text-slate-600">
                                Turno: {inv.turno}
                              </p>
                              <p className={`text-sm font-medium ${textColor}`}>
                                Estado: {inv.confirmacion}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:flex-col">
                            <button
                              onClick={() => {
                                isConfirmada
                                  ? handleRechazarInvitacion(inv)
                                  : handleAceptarInvitacion(inv);
                              }}
                              className={`rounded px-4 py-2 text-sm font-medium text-white transition ${
                                isConfirmada
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {isConfirmada ? "✗ Rechazar" : "✓ Aceptar"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {invConfirmadas.length === 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                      <p className="text-slate-600">
                        No has confirmado ninguna invitación aún.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "INVITAR" && (
            <div className="grid gap-3">
              {organizo.map((r) => (
                <ReservationCard
                  key={r.id_reserva}
                  reserva={r}
                  isOrganizer
                  showCancel={false}
                  onView={() => openDetail(r)}
                  onInvite={() => setInvite({ open: true, id: r.id_reserva })}
                />
              ))}
              {organizo.length === 0 && (
                <div className="text-sm text-slate-600">
                  No organizas reservas todavía.
                </div>
              )}
            </div>
          )}

          {tab === "RESENAR" && (
            <div className="grid gap-3">
              {pendientesResena.map((r) => (
                <ReviewCard
                  key={r.id_reserva}
                  reserva={r}
                  onReview={(res) => setReview({ open: true, reserva: res })}
                />
              ))}
              {pendientesResena.length === 0 && (
                <div className="text-sm text-slate-600">
                  No tienes reservas pendientes de reseña.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <ReservationDetailModal
        open={detail.open}
        onClose={() => setDetail({ open: false, reserva: null })}
        reserva={detail.reserva}
      />

      <InvitacionModal
        open={invite.open}
        onClose={() => setInvite({ open: false, id: null })}
        reservaId={invite.id}
        token={token}
        onSaved={triggerReload}
      />

      <ResenaModal
        open={review.open}
        onClose={() => setReview({ open: false, reserva: null })}
        reserva={review.reserva}
        token={token}
        onSaved={handleReviewSaved}
      />
    </div>
  );
}
