from flask import Blueprint, jsonify, request
from db import get_connection
from validators import (
    validar_disponibilidad_sala,
    validar_tipo_sala,
    validar_anticipacion_reserva,
    validar_cancelacion_reserva,
    validar_sanciones_activas,
    validate_reserva_fecha,
    validate_reserva_participante_fecha,
    ensure_no_solapamiento_de_reserva,
    ensure_capacidad_no_superada,
    ensure_reglas_usuario,
    validar_ci,
    es_organizador, validate_sancion_dates
)
from datetime import date as _date
from datetime import timedelta
from validation import verificar_token, requiere_rol
reservas_bp = Blueprint('reservas', __name__, url_prefix='/reservas')

#Todas las reservas
@reservas_bp.route('/all', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def reservas():

    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM reserva")
        resultados = cursor.fetchall()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()


#Obtener una reserva específica
@reservas_bp.route('/<int:id>', methods=['GET'])
@verificar_token
@requiere_rol('Participante')
def reservaEspecifica(id):

    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM reserva WHERE id_reserva = %s", (id,))
        reserva = cursor.fetchone()
        if reserva:
            return jsonify(reserva)
        else:
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

#Añadir una reserva
@reservas_bp.route('/registrar', methods=['POST'])
@verificar_token
@requiere_rol('Participante', 'Funcionario', 'Administrador')
def aniadirReserva():

    conection = get_connection()
    cursor = conection.cursor()
    data = request.get_json()

    nombre_sala = data.get("nombre_sala")
    edificio = data.get("edificio")
    fecha = data.get("fecha")
    id_turno = data.get("id_turno")
    ci = data.get("ci")
    estado = data.get("estado")
    participantes_ci = data.get("participantes_ci", [])

    if not all([nombre_sala, edificio, fecha, id_turno, ci]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    if not validar_ci(ci):
        return jsonify({'error': 'CI inválida'}), 400
    if estado not in ("Activa", "Finalizada", "Sin asistencia", "Cancelada"):
        return jsonify({'error': "Estado inválido. Use 'Activa', 'Finalizada', 'Sin asistencia' o 'Cancelada'"}), 400

    usuario = getattr(request, 'usuario_actual', {})
    ci_token = usuario.get("ci")
    rol_token = usuario.get("rol")

    if rol_token == 'Participante':
        if ci_token is None or int(ci_token) != int(ci):
            return jsonify({'error': 'No autorizado: el CI del token no coincide con el organizador'}), 403

    cusr = conection.cursor()
    cusr.execute("SELECT 1 FROM usuario WHERE ci = %s LIMIT 1", (ci,))
    if cusr.fetchone() is None:
        cusr.close()
        return jsonify({'error': 'El organizador no existe en el sistema'}), 400
    cusr.close()

    try:
        validate_reserva_fecha(fecha)

        ok, msg = validar_disponibilidad_sala(nombre_sala, edificio)
        if not ok:
            return jsonify({'error': msg}), 400

        ok, msg = validar_sanciones_activas(ci)
        if not ok:
            return jsonify({'error': msg}), 400

        ok, msg = validar_tipo_sala(edificio, nombre_sala, ci, participantes_ci)
        if not ok:
            return jsonify({'error': msg}), 400

        ok, msg = validar_anticipacion_reserva(id_turno, fecha)
        if not ok:
            return jsonify({'error': msg}), 400

        ensure_no_solapamiento_de_reserva(conection, nombre_sala, edificio, fecha, id_turno)

        cursor.execute("""
                       INSERT INTO reserva (nombre_sala, edificio, fecha, id_turno, estado, ci_organizador)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       """, (nombre_sala, edificio, fecha, id_turno, estado, ci))
        conection.commit()
        id_reserva = cursor.lastrowid

        ensure_reglas_usuario(conection, ci, id_reserva)

        cursor.execute("""
                       INSERT INTO reservaParticipante
                       (ci_participante, id_reserva, fecha_solicitud_reserva, asistencia, confirmacion)
                       VALUES (%s, %s, %s, %s, %s)
                       """, (ci, id_reserva, _date.today().strftime("%Y-%m-%d"), 'Asiste', 'Confirmado'))
        conection.commit()

        ensure_capacidad_no_superada(conection, id_reserva)

        return jsonify({'mensaje': 'Reserva registrada correctamente', 'id_reserva': id_reserva}), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

@reservas_bp.route('/invitar', methods=['POST'])
@verificar_token
@requiere_rol('Participante')
def invitarParticipante():

    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    data = request.get_json()

    email_invitado = (data.get("email_invitado") or "").strip().lower()
    id_reserva = data.get("id_reserva")
    asistencia = data.get("asistencia", "Asiste")
    fecha_solicitud = data.get("fecha_solicitud_reserva") or _date.today().strftime("%Y-%m-%d")

    if not all([email_invitado, id_reserva]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    usuario = getattr(request, 'usuario_actual', {})
    ci_token = usuario.get("ci")
    rol_token = usuario.get("rol")

    if rol_token == 'Participante':
        if not es_organizador(conection, id_reserva, ci_token):
            return jsonify({'error': 'Solo el organizador puede invitar participantes a esta reserva'}), 403

    try:
        cur_estado = conection.cursor(dictionary=True)
        cur_estado.execute("""
                           SELECT estado
                           FROM reserva
                           WHERE id_reserva = %s LIMIT 1
                           """, (id_reserva,))
        reserva_row = cur_estado.fetchone()
        cur_estado.close()

        if not reserva_row:
            return jsonify({'error': 'La reserva no existe'}), 404

        if reserva_row['estado'] != 'Activa':
            return jsonify({'error': 'Sólo se pueden invitar participantes a reservas activas'}), 400

        validate_reserva_participante_fecha(fecha_solicitud)

        cursor.execute("SELECT ci, rol FROM usuario WHERE email = %s", (email_invitado,))
        invitado = cursor.fetchone()
        if not invitado:
            return jsonify({'error': 'No existe un usuario con ese email'}), 404

        if invitado["rol"] in ("Administrador", "Funcionario"):
            return jsonify({
                'error': 'Sólo se pueden invitar usuarios con rol Participante'
            }), 400

        ci_invitado = invitado["ci"]
        if not validar_ci(ci_invitado):
            return jsonify({'error': 'CI del invitado inválida'}), 400

        if ci_token and int(ci_invitado) == int(ci_token):
            return jsonify({'error': 'El organizador ya forma parte de la reserva'}), 400

        ok, msg = validar_sanciones_activas(ci_invitado)
        if not ok:
            return jsonify({'error': 'El usuario tiene sanciones activas y no puede ser invitado a la reserva'}), 400

        ensure_reglas_usuario(conection, ci_invitado, id_reserva)

        cur_check = conection.cursor(dictionary=True)
        cur_check.execute("""
            SELECT 1
            FROM reservaParticipante
            WHERE ci_participante = %s
              AND id_reserva = %s
            LIMIT 1
        """, (ci_invitado, id_reserva))
        if cur_check.fetchone():
            return jsonify({'error': 'El usuario ya está invitado o registrado en esta reserva'}), 400

        cur_insert = conection.cursor()
        cur_insert.execute("""
            INSERT INTO reservaParticipante
            (ci_participante, id_reserva, fecha_solicitud_reserva, asistencia, confirmacion)
            VALUES (%s, %s, %s, %s, %s)
        """, (ci_invitado, id_reserva, fecha_solicitud, asistencia, 'Pendiente'))

        ensure_capacidad_no_superada(conection, id_reserva)

        conection.commit()

        return jsonify({'mensaje': 'Invitado agregado correctamente a la reserva'}), 201

    except Exception as e:
        conection.rollback()
        err = str(e)
        if "Duplicate entry" in err:
            return jsonify({'error': 'El usuario ya está invitado a esta reserva'}), 400
        return jsonify({'error': err}), 500
    finally:
        cursor.close()
        conection.close()

#Modificar una reserva 
@reservas_bp.route('/modificar/<int:id>', methods=['PUT'])
@verificar_token
@requiere_rol('Funcionario','Administrador')
def modificarReserva(id):

    conection = get_connection()
    cursor = conection.cursor()
    data = request.get_json()

    nombre_sala = data.get("nombre_sala")
    edificio = data.get("edificio")
    fecha = data.get("fecha")
    id_turno = data.get("id_turno")
    estado = data.get("estado")

    try:
        if fecha:
            validate_reserva_fecha(fecha)

        # Solo chequeamos solapamiento si tenemos todos los datos
        if all([nombre_sala, edificio, fecha, id_turno]):
            cur_check = conection.cursor()
            cur_check.execute("""
                SELECT 1
                FROM reserva
                WHERE nombre_sala = %s
                  AND edificio    = %s
                  AND fecha       = %s
                  AND id_turno    = %s
                  AND id_reserva <> %s
                LIMIT 1
            """, (nombre_sala, edificio, fecha, id_turno, id))
            if cur_check.fetchone():
                cur_check.close()
                return jsonify({'error': 'Ya existe una reserva para esa sala, fecha y turno.'}), 400
            cur_check.close()

        cursor.execute("""
            UPDATE reserva
               SET nombre_sala = %s,
                   edificio    = %s,
                   fecha       = %s,
                   id_turno    = %s,
                   estado      = %s
             WHERE id_reserva  = %s
        """, (nombre_sala, edificio, fecha, id_turno, estado, id))

        conection.commit()

        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404

        return jsonify({'mensaje': 'Reserva modificada correctamente'}), 200

    except ValueError as ve:
        conection.rollback()
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

#Eliminar una reserva
@reservas_bp.route('/eliminar/<int:id>', methods=['DELETE'])
@verificar_token
@requiere_rol('Funcionario', 'Administrador')
def eliminarReserva(id):

    conection = get_connection()
    cursor = conection.cursor()
    try:
        cursor.execute("DELETE FROM reserva WHERE id_reserva = %s", (id,))
        conection.commit()
        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
        return jsonify({'mensaje':'Reserva eliminada correctamente'}), 200
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

@reservas_bp.route('/cancelar/<int:id>', methods=['PATCH'])
@verificar_token
@requiere_rol('Participante','Administrador','Funcionario')
def cancelarReserva(id):

    conection = get_connection()
    cursor = conection.cursor()
    usuario = getattr(request, 'usuario_actual', {})
    ci_token = usuario.get("ci")
    rol_token = usuario.get("rol")
    if rol_token == 'Participante':
        if not es_organizador(conection, id, ci_token):
            cursor.close()
            conection.close()
            return jsonify({'error': 'Solo el organizador puede cancelar esta reserva'}), 403

    ok, msg = validar_cancelacion_reserva(id)
    if not ok:
        cursor.close()
        conection.close()
        return jsonify({'error': msg}), 400

    try:
        cursor.execute("UPDATE reserva SET estado = 'Cancelada' WHERE id_reserva = %s", (id,))
        if cursor.rowcount == 0:
            conection.rollback()
            return jsonify({'mensaje': 'Reserva no encontrada'}), 404
        conection.commit()
        return jsonify({'mensaje': 'Reserva cancelada correctamente'}), 200
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

@reservas_bp.route('/confirmacion/<int:id>', methods=['PATCH'])
@verificar_token
@requiere_rol('Participante')
def confirmarInvitado(id):
    usuario = getattr(request, 'usuario_actual', {})
    ci = usuario.get('ci')
    data = request.get_json() or {}
    raw_conf = (data.get("confirmacion") or "").strip().capitalize()

    if raw_conf not in ("Confirmado", "Rechazado"):
        return jsonify({"error": "Parámetro 'confirmacion' debe ser 'Confirmado' o 'Rechazado'"}), 400

    con = get_connection()
    cur = con.cursor(dictionary=True)

    try:
        cur.execute("SELECT ci_organizador FROM reserva WHERE id_reserva = %s", (id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Reserva no encontrada"}), 404

        if int(row['ci_organizador']) == int(ci):
            return jsonify({"error": "El organizador no usa confirmación de invitado"}), 400

        cur.execute("""
                    SELECT confirmacion, asistencia
                    FROM reservaParticipante
                    WHERE id_reserva = %s
                      AND ci_participante = %s
                    """, (id, ci))
        inv = cur.fetchone()
        if not inv:
            return jsonify({"error": "Invitación no encontrada"}), 404

        if inv['confirmacion'] == raw_conf:
            return jsonify({
                "mensaje": "Invitación ya estaba procesada",
                "confirmacion": raw_conf,
                "asistencia": inv['asistencia'],
            }), 200

        desired_asistencia = 'Asiste' if raw_conf == 'Confirmado' else 'No asiste'

        cur2 = con.cursor()
        cur2.execute("""
                     UPDATE reservaParticipante
                     SET confirmacion = %s,
                         asistencia   = %s
                     WHERE id_reserva = %s
                       AND ci_participante = %s
                     """, (raw_conf, desired_asistencia, id, ci))
        con.commit()

        return jsonify({
            "mensaje": "Invitación aceptada" if raw_conf == 'Confirmado' else "Invitación rechazada",
            "confirmacion": raw_conf,
            "asistencia": desired_asistencia
        }), 200

    finally:
        cur.close()
        con.close()

#Sala reseñada
@reservas_bp.route('/resena/<int:id>', methods=['PATCH'])
@verificar_token
@requiere_rol('Participante')
def actualizarResenia(id):

    conection = get_connection()
    cursor = conection.cursor()
    try:
        cursor.execute("UPDATE reservaParticipante SET resenado = NOT resenado WHERE id_reserva = %s", (id))
        conection.commit()
        return jsonify({'mensaje': 'Respuesta confirmada correctamente'}), 201

    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

@reservas_bp.route('/cedula', methods=['GET'])
@verificar_token
@requiere_rol('Participante')
def reservas_por_cedula():
    user = getattr(request, 'usuario_actual', {}) or {}
    ci_token = user.get('ci')
    rol = user.get('rol')

    ci = (request.args.get('ci') or '').strip()

    if not ci:
        return jsonify({"error": "Parámetro 'ci' es requerido"}), 400

    try:
        ci_int = int(ci)
    except ValueError:
        return jsonify({"error": "La cédula debe ser numérica"}), 400

    if rol == 'Participante' and ci_token is not None and int(ci_token) != ci_int:
        return jsonify({"error": "No autorizado para consultar reservas de otra cédula"}), 403

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                r.id_reserva,
                r.nombre_sala,
                r.edificio,
                r.fecha,
                r.id_turno,
                r.estado,
                r.ci_organizador,
                uo.nombre  AS nombre_organizador,
                uo.apellido AS apellido_organizador,
                t.hora_inicio,
                t.hora_fin,
                rp.confirmacion,
                rp.asistencia,
                (r.ci_organizador = %s) AS soyOrganizador,
                s.capacidad,
                (
                    SELECT COUNT(*)
                    FROM reservaParticipante rp2
                    WHERE rp2.id_reserva = r.id_reserva
                ) AS cantidad_participantes
            FROM reserva r
            JOIN turno t ON t.id_turno = r.id_turno
            JOIN salasDeEstudio s
              ON s.nombre_sala = r.nombre_sala
             AND s.edificio    = r.edificio
            JOIN usuario uo
              ON uo.ci = r.ci_organizador
            LEFT JOIN reservaParticipante rp
                   ON rp.id_reserva = r.id_reserva
                  AND rp.ci_participante = %s
            WHERE r.ci_organizador = %s
               OR EXISTS (
                    SELECT 1
                      FROM reservaParticipante rpx
                     WHERE rpx.id_reserva = r.id_reserva
                       AND rpx.ci_participante = %s
               )
            ORDER BY r.fecha DESC, r.id_turno DESC
        """, (ci_int, ci_int, ci_int, ci_int))
        filas = cur.fetchall()

        for f in filas:
            f["fecha"] = str(f["fecha"])
            hi = f.get("hora_inicio")
            hf = f.get("hora_fin")
            if isinstance(hi, timedelta):
                f["hora_inicio"] = str(hi)[:5]
            if isinstance(hf, timedelta):
                f["hora_fin"] = str(hf)[:5]

        return jsonify(filas), 200

    except Exception as e:
        print("ERROR en /reservas/cedula:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@reservas_bp.route('/invitaciones', methods=['GET'])
@verificar_token
@requiere_rol('Participante')
def reservas_invitaciones():

    estado = (request.args.get('estado') or '').strip().lower()
    user = getattr(request, 'usuario_actual', {})
    ci = user.get('ci')

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        filtro = ""
        if estado == 'pendiente':
            filtro = "AND rp.confirmacion = 'Pendiente'"
        elif estado in ('confirmada', 'confirmadas'):
            filtro = "AND rp.confirmacion = 'Confirmado'"
        elif estado in ('rechazada', 'rechazadas'):
            filtro = "AND rp.confirmacion = 'Rechazado'"

        cur.execute(f"""
            SELECT r.id_reserva, r.nombre_sala, r.edificio, r.fecha, r.id_turno,
                   t.hora_inicio, t.hora_fin, rp.confirmacion
            FROM reserva r
            JOIN reservaParticipante rp ON rp.id_reserva = r.id_reserva
            JOIN turno t ON t.id_turno = r.id_turno
            WHERE rp.ci_participante = %s
              AND r.ci_organizador <> %s
              AND r.estado = 'Activa'
              {filtro}
            ORDER BY r.fecha DESC, r.id_turno DESC
        """, (ci, ci))
        filas = cur.fetchall()

        items = []
        for f in filas:
            items.append({
                "id": f"{f['id_reserva']}-{ci}",
                "reservaId": f['id_reserva'],
                "sala": f['nombre_sala'],
                "edificio": f['edificio'],
                "fecha": str(f['fecha']),
                "turno": f"{str(f['hora_inicio'])[:5]}–{str(f['hora_fin'])[:5]}",
                "confirmacion": f['confirmacion'],
            })
        return jsonify(items)
    finally:
        cur.close(); con.close()

@reservas_bp.route('/salir/<int:id_reserva>', methods=['DELETE'])
@verificar_token
@requiere_rol('Participante', 'Administrador', 'Funcionario')
def salir_de_reserva(id_reserva):

    usuario = getattr(request, 'usuario_actual', {}) or {}
    ci_token = usuario.get('ci')
    rol = usuario.get('rol')

    if rol == 'Participante' and ci_token is None:
        return jsonify({"error": "CI no encontrada en el token"}), 400

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("SELECT ci_organizador FROM reserva WHERE id_reserva = %s", (id_reserva,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Reserva no encontrada"}), 404

        ci_organizador = int(row['ci_organizador'])

        if rol == 'Participante' and int(ci_token) == ci_organizador:
            return jsonify({"error": "El organizador no puede salir de la reserva de esta forma"}), 400

        cur2 = con.cursor()
        cur2.execute(
            "DELETE FROM reservaParticipante WHERE id_reserva = %s AND ci_participante = %s",
            (id_reserva, ci_token),
        )
        con.commit()

        if cur2.rowcount == 0:
            return jsonify({"error": "No estabas registrado en esta reserva"}), 404

        return jsonify({"mensaje": "Te has salido de la reserva correctamente"}), 200

    except Exception as e:
        con.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@reservas_bp.route('/detalle/<int:id>', methods=['GET'])
@verificar_token
@requiere_rol('Participante', 'Administrador', 'Funcionario')
def reserva_detalle(id):

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                r.id_reserva,
                r.nombre_sala,
                r.edificio,
                r.fecha,
                r.id_turno,
                r.estado,
                r.ci_organizador,
                uo.nombre AS nombre_organizador,
                uo.apellido AS apellido_organizador,
                t.hora_inicio,
                t.hora_fin,
                s.capacidad
            FROM reserva r
            JOIN turno t ON t.id_turno = r.id_turno
            JOIN usuario uo ON uo.ci = r.ci_organizador
            JOIN salasDeEstudio s
                 ON s.nombre_sala = r.nombre_sala
                AND s.edificio    = r.edificio
            WHERE r.id_reserva = %s
        """, (id,))
        reserva = cur.fetchone()
        if not reserva:
            return jsonify({"error": "Reserva no encontrada"}), 404

        cur2 = con.cursor(dictionary=True)
        cur2.execute("""
            SELECT
                rp.ci_participante,
                u.nombre,
                u.apellido,
                rp.confirmacion,
                rp.asistencia
            FROM reservaParticipante rp
            JOIN usuario u ON u.ci = rp.ci_participante
            WHERE rp.id_reserva = %s
            ORDER BY u.apellido, u.nombre
        """, (id,))
        participantes = cur2.fetchall()
        for p in participantes:
            p["ci"] = p.pop("ci_participante")
            p["estado_confirmacion"] = p.pop("confirmacion")
        reserva["participantes"] = participantes

        reserva["hora_inicio"] = str(reserva["hora_inicio"])[:5]
        reserva["hora_fin"] = str(reserva["hora_fin"])[:5]

        return jsonify(reserva), 200

    except Exception as e:
        print("ERROR en /reservas/detalle:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@reservas_bp.route('/para-resenar', methods=['GET'])
@verificar_token
@requiere_rol('Participante')
def reservas_para_resenar():
    user = getattr(request, 'usuario_actual', {}) or {}
    ci = user.get('ci')

    if not ci:
        return jsonify({"error": "CI no encontrada en el token"}), 400

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                r.id_reserva,
                r.nombre_sala,
                r.edificio,
                r.fecha,
                r.estado,
                t.hora_inicio,
                t.hora_fin,
                rp.asistencia,
                rp.resenado
            FROM reserva r
            JOIN turno t
              ON t.id_turno = r.id_turno
            JOIN reservaParticipante rp
              ON rp.id_reserva = r.id_reserva
            WHERE rp.ci_participante = %s
              AND r.estado = 'Finalizada'
              AND rp.asistencia = 'Asiste'
              AND rp.resenado = FALSE
            ORDER BY r.fecha DESC, r.id_turno DESC
        """, (ci,))

        filas = cur.fetchall()
        for f in filas:
            f["hora_inicio"] = str(f["hora_inicio"])[:5]
            f["hora_fin"] = str(f["hora_fin"])[:5]

        return jsonify(filas), 200
    except Exception as e:
        print("ERROR en /reservas/para-resenar:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@reservas_bp.route('/sin-asistencia/<int:id_reserva>', methods=['POST'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def marcar_reserva_sin_asistencia(id_reserva):
    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("SELECT estado FROM reserva WHERE id_reserva = %s", (id_reserva,))
        reserva = cur.fetchone()
        if not reserva:
            return jsonify({"error": "Reserva no encontrada"}), 404

        cur.execute("""
            SELECT ci_participante, confirmacion, asistencia
              FROM reservaParticipante
             WHERE id_reserva = %s
        """, (id_reserva,))
        participantes = cur.fetchall()

        if not participantes:
            return jsonify({"error": "La reserva no tiene participantes"}), 400

        a_sancionar = [
            p for p in participantes
            if (p["confirmacion"] == "Confirmado" and (p["asistencia"] or "").lower() == "no asiste")
        ]

        if not a_sancionar:
            return jsonify({
                "error": "No hay participantes confirmados marcados como 'No asiste' para sancionar"
            }), 400

        cur2 = con.cursor()
        cur2.execute("""
            UPDATE reserva
               SET estado = 'Sin asistencia'
             WHERE id_reserva = %s
        """, (id_reserva,))
        if cur2.rowcount == 0:
            con.rollback()
            return jsonify({"error": "Reserva no encontrada al actualizar estado"}), 404

        hoy = _date.today()
        fecha_inicio = hoy.strftime("%Y-%m-%d")
        fecha_fin = (hoy + timedelta(days=60)).strftime("%Y-%m-%d")  # 7 días de sanción

        try:
            validate_sancion_dates(fecha_inicio, fecha_fin)
        except ValueError as ve:
            con.rollback()
            return jsonify({"error": str(ve)}), 400

        creadas = 0
        saltadas_por_sancion_activa = 0

        for p in a_sancionar:
            ci_p = p["ci_participante"]

            motivo = "Inasistencia"
            cur_sanc = con.cursor()
            cur_sanc.execute("""
                INSERT INTO sancion_participante (ci_participante, motivo, fecha_inicio, fecha_fin)
                VALUES (%s, %s, %s, %s)
            """, (ci_p, motivo, fecha_inicio, fecha_fin))
            creadas += 1

        con.commit()

        return jsonify({
            "mensaje": "Reserva marcada como 'Sin asistencia'. Sanciones aplicadas.",
            "sanciones_creadas": creadas,
            "omitidos_por_sancion_activa": saltadas_por_sancion_activa
        }), 200

    except Exception as e:
        con.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@reservas_bp.route('/participante/<int:id_reserva>/<int:ci_participante>/asistencia', methods=['PATCH'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def actualizar_asistencia_participante(id_reserva, ci_participante):
    data = request.get_json(silent=True)
    if isinstance(data, dict):
        asistencia_raw = data.get("asistencia")
    elif isinstance(data, str):
        asistencia_raw = data
    else:
        asistencia_raw = None

    asistencia = (asistencia_raw or "").strip().capitalize()
    if asistencia not in ("Asiste", "No asiste"):
        return jsonify({"error": "El campo 'asistencia' debe ser 'Asiste' o 'No asiste'"}), 400

    con = get_connection()
    cur = con.cursor()
    try:
        cur.execute("SELECT 1 FROM reserva WHERE id_reserva = %s", (id_reserva,))
        if not cur.fetchone():
            return jsonify({"error": "Reserva no encontrada"}), 404

        cur.execute("""
            UPDATE reservaParticipante
               SET asistencia = %s
             WHERE id_reserva = %s
               AND ci_participante = %s
        """, (asistencia, id_reserva, ci_participante))
        con.commit()

        if cur.rowcount == 0:
            return jsonify({"error": "Participante no encontrado en esta reserva"}), 404

        return jsonify({"mensaje": "Asistencia actualizada correctamente"}), 200

    except Exception as e:
        con.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()


@reservas_bp.route('/participante/<int:id_reserva>/<int:ci_participante>', methods=['DELETE'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def eliminar_participante_reserva(id_reserva, ci_participante):
    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("SELECT ci_organizador FROM reserva WHERE id_reserva = %s", (id_reserva,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Reserva no encontrada"}), 404

        ci_organizador = int(row["ci_organizador"])
        ci_participante_int = int(ci_participante)

        if ci_participante_int == ci_organizador:
            return jsonify({"error": "No se puede eliminar al organizador de la reserva"}), 400

        cur2 = con.cursor()
        cur2.execute("""
            DELETE FROM reservaParticipante
             WHERE id_reserva = %s
               AND ci_participante = %s
        """, (id_reserva, ci_participante))
        con.commit()

        if cur2.rowcount == 0:
            return jsonify({"error": "Participante no encontrado en esta reserva"}), 404

        return jsonify({"mensaje": "Participante eliminado correctamente"}), 200

    except Exception as e:
        con.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()
