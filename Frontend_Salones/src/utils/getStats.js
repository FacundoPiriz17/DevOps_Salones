import { apiFetch } from "./api";

async function getStats(endpoint) {
  const token = localStorage.getItem("token");
  return await apiFetch(`/stats/${endpoint}`, { token });
}

//Salas mas reservadas:
export async function getSalasMasReservadas() {
  return await getStats("salas_mas_reservadas");
}

export async function getTurnosMasDemandados() {
  return await getStats("turnos_mas_demandados");
}

export async function getPromedioParticipantesSala() {
  return await getStats("promedio_participantes_sala");
}

export async function getCantReservas() {
  return await getStats("cant_reservas_carr_facu");
}

export async function getPorcentajeOcupacion() {
  return await getStats("porcentaje_ocupacion_salas_edificio");
}

export async function getCantidadResevasAsistencias() {
  return await getStats("res_asist_profesores_alumnos");
}

export async function getCantidadSanciones() {
  return await getStats("cant_sanciones_profesores_alumnos");
}

export async function getPorcentajeReservasUtilizadas() {
  return await getStats("porcentaje_reservas_utilizadas");
}

export async function getTop10UsuariosMasReservas() {
  return await getStats("top_10_usuarios_mas_reservas");
}

export async function getReservasPorDia() {
  return await getStats("reservas_por_dayweek");
}

export async function getSalasMenorOcupacion() {
  return await getStats("salas_menor_ocupacion");
}
