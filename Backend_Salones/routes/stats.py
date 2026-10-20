from flask import Blueprint, request, jsonify
from db import get_connection
from validation import verificar_token, requiere_rol

stats_bp = Blueprint('stats', __name__, url_prefix='/stats')

def run_query(query):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query)
        resultados = cursor.fetchall()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


# Salas más reservadas
@stats_bp.route('/salas_mas_reservadas', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def salas_mas_reservadas():
    query = '''
    SELECT nombre_sala, edificio, COUNT(*) AS total_reservas
    FROM reserva
    GROUP BY nombre_sala, edificio
    ORDER BY total_reservas DESC
    LIMIT 10;
    '''
    return run_query(query)


# Turnos más demandados
@stats_bp.route('/turnos_mas_demandados', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def turnos_mas_demandados():
    query = '''
    SELECT t.id_turno,
           TIME_FORMAT(t.hora_inicio, '%H:%i') AS hora_inicio,
           TIME_FORMAT(t.hora_fin, '%H:%i') AS hora_fin,
           COUNT(r.id_reserva) AS total_reservas
    FROM turno t
    LEFT JOIN reserva r ON t.id_turno = r.id_turno
    GROUP BY t.id_turno, t.hora_inicio, t.hora_fin
    ORDER BY total_reservas DESC;
    '''
    return run_query(query)


# Promedio de participantes por sala
@stats_bp.route('/promedio_participantes_sala', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def promedio_participantes_sala():
    query = """
    SELECT r.nombre_sala,
           r.edificio,
           AVG(IFNULL(p.total, 0)) AS promedio_participantes
    FROM reserva r
    LEFT JOIN (
        SELECT id_reserva,
               COUNT(*) AS total
        FROM reservaParticipante
        GROUP BY id_reserva
    ) p ON r.id_reserva = p.id_reserva
    WHERE r.estado = 'Finalizada'
    GROUP BY r.nombre_sala, r.edificio
    ORDER BY promedio_participantes DESC;
    """
    return run_query(query)


# Cantidad de reservas por carrera y facultad
@stats_bp.route('/cant_reservas_carr_facu', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def cant_reservas_carr_facu():
    query = '''
    SELECT pa.nombre_plan, pa.tipo, f.nombre_facultad,
           COUNT(DISTINCT rp.id_reserva) AS total_reservas
    FROM reservaParticipante rp
    JOIN participanteProgramaAcademico ppa ON rp.ci_participante = ppa.ci_participante
    JOIN planAcademico pa ON ppa.nombre_plan = pa.nombre_plan
    JOIN facultad f ON pa.id_Facultad = f.id_Facultad
    GROUP BY pa.nombre_plan, pa.tipo, f.nombre_facultad
    ORDER BY total_reservas DESC;
    '''
    return run_query(query)


# Porcentaje de ocupación de salas por edificio
@stats_bp.route('/porcentaje_ocupacion_salas_edificio', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def porcentaje_ocupacion_salas_edificio():
    query = """
    SELECT edificio,
           SUM(total_participantes) AS participantes_totales,
           SUM(capacidad_reservada) AS capacidad_total,
           ROUND(
               100.0 * SUM(total_participantes) /
               NULLIF(SUM(capacidad_reservada), 0),
               2
           ) AS porcentaje_ocupacion
    FROM (
        SELECT r.edificio,
               s.capacidad AS capacidad_reservada,
               (
                   SELECT COUNT(*)
                   FROM reservaParticipante rp
                   WHERE rp.id_reserva = r.id_reserva
               ) AS total_participantes
        FROM reserva r
        JOIN salasDeEstudio s
            ON r.nombre_sala = s.nombre_sala
           AND r.edificio = s.edificio
        WHERE r.estado = 'Finalizada'
    ) ocupacion
    GROUP BY edificio
    ORDER BY porcentaje_ocupacion DESC;
    """
    return run_query(query)


# Cantidad de reservas y asistencias de profesores y alumnos
@stats_bp.route('/res_asist_profesores_alumnos', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def res_asist_profesores_alumnos():
    query = '''
    SELECT ppa.rol, pa.tipo,
       COUNT(DISTINCT rp.id_reserva) AS total_reservas,
       SUM(CASE WHEN rp.asistencia = 'Asiste' THEN 1 ELSE 0 END) AS total_asistencias
    FROM reservaParticipante rp
    JOIN participanteProgramaAcademico ppa ON rp.ci_participante = ppa.ci_participante
    JOIN planAcademico pa ON ppa.nombre_plan = pa.nombre_plan
    GROUP BY ppa.rol, pa.tipo
    ORDER BY total_reservas DESC;
    '''
    return run_query(query)


# Cantidad de sanciones profesores/alumnos
@stats_bp.route('/cant_sanciones_profesores_alumnos', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def cant_sanciones_profesores_alumnos():
    query = '''
    SELECT ppa.rol, pa.tipo, COUNT(*) AS total_sanciones
    FROM sancion_participante sp
    JOIN participanteProgramaAcademico ppa ON sp.ci_participante = ppa.ci_participante
    JOIN planAcademico pa ON ppa.nombre_plan = pa.nombre_plan
    GROUP BY ppa.rol, pa.tipo
    ORDER BY total_sanciones DESC;
    '''
    return run_query(query)


# Porcentaje reservas utilizadas
@stats_bp.route('/porcentaje_reservas_utilizadas', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def porcentaje_reservas_utilizadas():
    query = """
    SELECT COUNT(*) AS total_reservas,
           SUM(CASE WHEN estado = 'Finalizada' THEN 1 ELSE 0 END) AS reservas_utilizadas,
           SUM(CASE WHEN estado IN ('Cancelada', 'Sin asistencia') THEN 1 ELSE 0 END) AS reservas_no_utilizadas,
           ROUND(
               100.0 * SUM(CASE WHEN estado = 'Finalizada' THEN 1 ELSE 0 END) /
               NULLIF(COUNT(*), 0),
               2
           ) AS pct_utilizadas,
           ROUND(
               100.0 * SUM(CASE WHEN estado IN ('Cancelada', 'Sin asistencia') THEN 1 ELSE 0 END) /
               NULLIF(COUNT(*), 0),
               2
           ) AS pct_no_utilizadas
    FROM reserva
    WHERE estado IN ('Finalizada', 'Cancelada', 'Sin asistencia');
    """
    return run_query(query)


# Top 10 usuarios con más reservas
@stats_bp.route('/top_10_usuarios_mas_reservas', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def top_10_usuarios_mas_reservas():
    query = '''
    SELECT u.ci, u.nombre, u.apellido, COUNT(DISTINCT rp.id_reserva) AS total_reservas
    FROM reservaParticipante rp
    JOIN usuario u ON rp.ci_participante = u.ci
    GROUP BY u.ci, u.nombre, u.apellido
    ORDER BY total_reservas DESC
    LIMIT 10;
    '''
    return run_query(query)


# Reservas por día de la semana
@stats_bp.route('/reservas_por_dayweek', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def reservas_por_dayweek():
    query = '''
    SELECT 
        CASE DAYOFWEEK(fecha)
            WHEN 1 THEN 'Domingo'
            WHEN 2 THEN 'Lunes'
            WHEN 3 THEN 'Martes'
            WHEN 4 THEN 'Miércoles'
            WHEN 5 THEN 'Jueves'
            WHEN 6 THEN 'Viernes'
            WHEN 7 THEN 'Sábado'
        END AS dia_semana,
        COUNT(*) AS total_reservas
    FROM reserva
    GROUP BY DAYOFWEEK(fecha), dia_semana
    ORDER BY DAYOFWEEK(fecha);
    '''
    return run_query(query)

# Salas con menor ocupación
@stats_bp.route('/salas_menor_ocupacion', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def salas_menor_ocupacion():
    query = '''
    SELECT nombre_sala, edificio, COUNT(*) AS total_reservas
    FROM reserva
    GROUP BY nombre_sala, edificio
    ORDER BY total_reservas ASC
    LIMIT 5;
    '''
    return run_query(query)
