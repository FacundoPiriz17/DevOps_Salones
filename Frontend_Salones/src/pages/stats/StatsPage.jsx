import { useState, useEffect } from "react";
import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import Navbar from "../../components/Navbar.jsx";
import {
    getSalasMasReservadas,
    getTurnosMasDemandados,
    getPromedioParticipantesSala,
    getCantReservas,
    getPorcentajeOcupacion,
    getCantidadResevasAsistencias,
    getCantidadSanciones,
    getPorcentajeReservasUtilizadas,
    getTop10UsuariosMasReservas,
    getReservasPorDia,
    getSalasMenorOcupacion,
} from "../../utils/getStats";
import Footer from "../../components/Footer.jsx";
import CanvasJSReact from "@canvasjs/react-charts";


export default function StatsPage() {

    const CanvasJSChart = CanvasJSReact.CanvasJSChart;
    const [salasMasReservadas, setSalasMasReservadas] = useState([]);
    const [turnosDemandados, setTurnosDemandados] = useState([]);
    const [promedioParticipantes, setPromedioParticipantes] = useState([]);
    const [reservasCarreraFacultad, setReservasCarreraFacultad] = useState([]);
    const [porcentajeOcupacion, setPorcentajeOcupacion] = useState([]);
    const [reservasAsistencias, setReservasAsistencias] = useState([]);
    const [sanciones, setSanciones] = useState([]);
    const [porcentajeUtilizadas, setPorcentajeUtilizadas] = useState(null);
    const [top10Usuarios, setTop10Usuarios] = useState([]);
    const [reservasPorDia, setReservasPorDia] = useState([]);
    const [salasMenorOcupacion, setSalasMenorOcupacion] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const reservasPorDiaOptions = {
        animationEnabled: true,
        exportEnabled: true,
        theme: "light2",
        title: {
            text: "Reservas por día de la semana",
        },
        axisY: {
            includeZero: true,
            title: "Cantidad de reservas",
        },
        axisX: {
            title: "Día de la semana",
        },
        data: [
            {
                type: "column",
                indexLabel: "{y}",
                indexLabelFontColor: "#5A5757",
                indexLabelPlacement: "outside",
                dataPoints: reservasPorDia.map((dia) => ({
                    label: dia.dia_semana,          // ej: "Lunes"
                    y: Number(dia.total_reservas),  // cantidad de reservas
                })),
            },
        ],
    };

    useEffect(() => {
        async function cargarEstadisticas() {
            setLoading(true);
            try {
                const [
                    salas,
                    turnos,
                    promedio,
                    carreras,
                    ocupacion,
                    asistencias,
                    sanc,
                    pctUtilizadas,
                    usuarios,
                    dias,
                    menorOcup,
                ] = await Promise.all([
                    getSalasMasReservadas(),
                    getTurnosMasDemandados(),
                    getPromedioParticipantesSala(),
                    getCantReservas(),
                    getPorcentajeOcupacion(),
                    getCantidadResevasAsistencias(),
                    getCantidadSanciones(),
                    getPorcentajeReservasUtilizadas(),
                    getTop10UsuariosMasReservas(),
                    getReservasPorDia(),
                    getSalasMenorOcupacion(),
                ]);

                setSalasMasReservadas(salas);
                setTurnosDemandados(turnos);
                setPromedioParticipantes(promedio);
                setReservasCarreraFacultad(carreras);
                setPorcentajeOcupacion(ocupacion);
                setReservasAsistencias(asistencias);
                setSanciones(sanc);
                setPorcentajeUtilizadas(pctUtilizadas[0]);
                setTop10Usuarios(usuarios);
                setReservasPorDia(dias);
                setSalasMenorOcupacion(menorOcup);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        cargarEstadisticas();
    }, []);

    if (loading) {
        return (
            <div className="min-h-dvh bg-gradient-to-b from-gray-100 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800 mx-auto mb-4"></div>
                    <p className="text-xl text-blue-800">Cargando estadísticas...</p>
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
            <Navbar/>

            <div className="flex min-w-0 flex-col lg:flex-row flex-1">
                <SidebarAdmin />
                <div className="min-w-0 flex-1 py-6 px-4 sm:py-8 sm:px-6">
                    <h2 className="text-3xl font-bold text-blue-800 mb-6 text-center">
                        Panel de Estadísticas Completo
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Salas Más Reservadas
                            </h3>
                            <ul className="space-y-2">
                                {salasMasReservadas.slice(0, 5).map((sala, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                    <span className="font-medium">
                      {sala.nombre_sala} - {sala.edificio}
                    </span>
                                        <span className="text-gray-600">{sala.total_reservas}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Turnos más demandados */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Turnos Más Demandados
                            </h3>
                            <ul className="space-y-2">
                                {turnosDemandados.slice(0, 5).map((turno, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                    <span className="font-medium">
                      {turno.hora_inicio} - {turno.hora_fin}
                    </span>
                                        <span className="text-gray-600">
                      {turno.total_reservas}
                    </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Porcentaje de reservas utilizadas */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Reservas Utilizadas
                            </h3>
                            <div className="text-center">
                                <p className="text-4xl font-bold text-blue-600 mb-2">
                                    {porcentajeUtilizadas?.pct_utilizadas}%
                                </p>
                                <p className="text-sm text-gray-600">
                                    {porcentajeUtilizadas?.reservas_utilizadas} de{" "}
                                    {porcentajeUtilizadas?.total_reservas} reservas
                                </p>
                                <p className="text-sm text-red-600 mt-2">
                                    No utilizadas: {porcentajeUtilizadas?.pct_no_utilizadas}%
                                </p>
                            </div>
                        </div>

                        {/* Promedio de participantes por sala */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Promedio Participantes por Sala
                            </h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {promedioParticipantes.slice(0, 5).map((sala, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                    <span className="font-medium">
                      {sala.nombre_sala} - {sala.edificio}
                    </span>
                                        <span className="text-gray-600">
                      {parseFloat(sala.promedio_participantes).toFixed(1)}
                    </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Top 10 usuarios */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Top 10 Usuarios con Más Reservas
                            </h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {top10Usuarios.map((usuario, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                    <span className="font-medium">
                      {usuario.nombre} {usuario.apellido}
                    </span>
                                        <span className="text-gray-600">
                      {usuario.total_reservas}
                    </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Salas con menor ocupación */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Salas con Menor Ocupación
                            </h3>
                            <ul className="space-y-2">
                                {salasMenorOcupacion.map((sala, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                    <span className="font-medium">
                      {sala.nombre_sala} - {sala.edificio}
                    </span>
                                        <span className="text-gray-600">{sala.total_reservas}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Reservas por día de la semana */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Reservas por Día de la Semana
                            </h3>

                            {reservasPorDia.length > 0 ? (
                                <CanvasJSChart
                                    options={reservasPorDiaOptions}
                                    containerProps={{
                                        width: "100%",
                                        height: "260px",
                                    }}
                                />
                            ) : (
                                <p className="text-sm text-gray-600">
                                    No hay datos suficientes para mostrar el gráfico.
                                </p>
                            )}
                        </div>

                        {/* Porcentaje de ocupación por edificio */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Ocupación por Edificio
                            </h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {porcentajeOcupacion.map((edificio, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                                        <span className="font-medium">{edificio.edificio}</span>
                                        <span className="text-gray-600">
                      {edificio.porcentaje_ocupacion}%
                    </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Reservas y asistencias por rol */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Reservas y Asistencias (Profesores/Alumnos)
                            </h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {reservasAsistencias.map((dato, index) => (
                                    <li key={index} className="border-b pb-2 text-sm">
                                        <div className="font-medium">
                                            {dato.rol} - {dato.tipo}
                                        </div>
                                        <div className="text-gray-600 flex justify-between">
                                            <span>Reservas: {dato.total_reservas}</span>
                                            <span>Asistencias: {dato.total_asistencias}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Sanciones por rol */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Sanciones por Rol
                            </h3>
                            <ul className="space-y-2">
                                {sanciones.map((sancion, index) => (
                                    <li
                                        key={index}
                                        className="flex justify-between border-b pb-2 text-sm"
                                    >
                    <span className="font-medium">
                      {sancion.rol} - {sancion.tipo}
                    </span>
                                        <span className="text-red-600">
                      {sancion.total_sanciones}
                    </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Reservas por carrera y facultad */}
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md col-span-1 md:col-span-2">
                            <h3 className="text-xl font-bold text-blue-800 mb-4">
                                Reservas por Carrera y Facultad
                            </h3>
                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                {reservasCarreraFacultad.slice(0, 10).map((carrera, index) => (
                                    <li key={index} className="border-b pb-2 text-sm">
                                        <div className="font-medium">{carrera.nombre_plan}</div>
                                        <div className="text-gray-600 flex justify-between">
                      <span>
                        {carrera.tipo} - {carrera.nombre_facultad}
                      </span>
                                            <span>{carrera.total_reservas} reservas</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <Footer/>
        </div>
    );
}
