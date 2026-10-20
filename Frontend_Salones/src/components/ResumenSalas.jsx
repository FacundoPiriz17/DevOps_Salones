import {
  getSalasMasReservadas,
  getTurnosMasDemandados,
  getPorcentajeReservasUtilizadas,
} from "../utils/getStats";
import { useState, useEffect } from "react";
export default function ResumenSalas() {
  const [masReservadas, setMasReservadas] = useState([]);
  const [turnosDemandados, setTurnosDemandados] = useState([]);
  const [porcentajeUtilizado, setPorcentajeUtilizado] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarEstadisticas() {
      setLoading(true);
      try {
        const [salas, turnos, porcentaje] = await Promise.all([
          getSalasMasReservadas(),
          getTurnosMasDemandados(),
          getPorcentajeReservasUtilizadas(),
        ]);
        setMasReservadas(salas.slice(0, 4));
        setTurnosDemandados(turnos.slice(0, 4));
        setPorcentajeUtilizado(porcentaje[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    cargarEstadisticas();
  }, []);

  if (loading)
    return (
      <div className="text-center p-6 text-lg">
        <p>Cargando</p>
      </div>
    );
  if (error)
    return (
      <div className="text-center p-6 text-lg">
        <p>{`Se produjo un error: ${error}`}</p>
      </div>
    );

  return (
    <div>
      <div className="mt-8 bg-white p-6 rounded-xl shadow-md w-full max-w-lg">
        <h2>Estadísticas de Salas:</h2>
        <div>
          <div>
            <h4>Salas mas Reservadas:</h4>
            <ul>
              {masReservadas.map((sala, index) => (
                <li key={index} className="flex justify-between border-b pb-2">
                  <span className="font-medium">
                    {sala.nombre_sala} - {sala.edificio}
                  </span>
                  <span className="text-gray-600">
                    {sala.total_reservas} reservas
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Turnos Mas Demandados</h4>
            <ul>
              {turnosDemandados.map((turno, index) => (
                <li key={index} className="flex justify-between border-b pb-2">
                  <span className="font-medium">
                    {turno.hora_inicio} - {turno.hora_fin}
                  </span>
                  <span className="text-gray-600">
                    {turno.total_reservas} reservas
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Porcentaje de Reservas Utilizadas: </h4>
            <p>{`Reservas Utilizadas: ${porcentajeUtilizado?.pct_utilizadas}%`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
