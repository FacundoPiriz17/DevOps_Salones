from flask import Blueprint, jsonify, request
from db import get_connection
from validators import (
    validar_resena_unica,
    validar_ci,
)
from validation import verificar_token, requiere_rol
resenias_bp = Blueprint('resenas', __name__, url_prefix='/resenas')

def _recalcular_puntaje_sala(conn, id_reserva):
    c = conn.cursor()
    c.execute("""
        SELECT r.nombre_sala, r.edificio
        FROM reserva r
        WHERE r.id_reserva = %s
    """, (id_reserva,))
    row = c.fetchone()
    if not row:
        c.close()
        return

    nombre_sala, edificio = row

    c.execute("""
        SELECT AVG(rs.puntaje_general)
        FROM resena rs
        JOIN reserva r2 ON r2.id_reserva = rs.id_reserva
        WHERE r2.nombre_sala = %s AND r2.edificio = %s
    """, (nombre_sala, edificio))
    avg_row = c.fetchone()
    promedio = avg_row[0] if avg_row else None

    if promedio is None:
        c.close()
        return

    c.execute("""
        UPDATE salasDeEstudio
        SET puntaje = LEAST(GREATEST(ROUND(%s), 1), 5)
        WHERE nombre_sala = %s AND edificio = %s
    """, (promedio, nombre_sala, edificio))
    c.close()

#Todas las reseñas
@resenias_bp.route('/all', methods=['GET'])
@verificar_token
@requiere_rol('Funcionario','Administrador')
def resenias():
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT
            r.id_resena,
            r.id_reserva,
            r.ci_participante,
            CASE
                WHEN u.ci IS NULL THEN NULL
                ELSE CONCAT(u.nombre, ' ', u.apellido)
            END AS nombre_completo,
            r.fecha_publicacion,
            r.puntaje_general,
            r.descripcion,
            s.nombre_sala,
            s.edificio
        FROM resena r
        LEFT JOIN usuario u ON u.ci = r.ci_participante
        JOIN reserva res ON res.id_reserva = r.id_reserva
        JOIN salasDeEstudio s ON s.nombre_sala = res.nombre_sala
                             AND s.edificio = res.edificio
        ORDER BY r.fecha_publicacion DESC;
        """)
        resultados = cursor.fetchall()
        return jsonify(resultados), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

#Obtener una reseña específica
@resenias_bp.route('/resena/<int:id>', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def reseniasEspecifica(id):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("""
        SELECT
            r.id_resena,
            r.id_reserva,
            r.ci_participante,
            CASE
                WHEN u.ci IS NULL THEN NULL
                ELSE CONCAT(u.nombre, ' ', u.apellido)
            END AS nombre_completo,
            r.fecha_publicacion,
            r.puntaje_general,
            r.descripcion,
            s.nombre_sala,
            s.edificio
        FROM resena r
        LEFT JOIN usuario u ON u.ci = r.ci_participante
        JOIN reserva res ON res.id_reserva = r.id_reserva
        JOIN salasDeEstudio s ON s.nombre_sala = res.nombre_sala
                             AND s.edificio = res.edificio
        WHERE r.id_resena = %s
        """, (id,))
        resenia = cursor.fetchone()
        if resenia:
            return jsonify(resenia), 200
        else:
            return jsonify({'mensaje': 'Reseña no encontrada'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()


@resenias_bp.route('/registrar', methods=['POST'])
@verificar_token
@requiere_rol('Participante')
def aniadirResenia():
    conection = get_connection()
    cursor = conection.cursor()
    data = request.get_json()

    ci_participante = data.get("ci_participante")
    id_reserva = data.get("id_reserva")
    puntaje_general = data.get("puntaje_general")
    descripcion = data.get("descripcion")

    if not all([ci_participante, id_reserva, puntaje_general]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    if not validar_ci(ci_participante):
        return jsonify({'error': 'Cédula inválida'}), 400

    try:
        punt = int(puntaje_general)
    except Exception:
        return jsonify({'error': 'Puntaje debe ser un número entre 1 y 5'}), 400

    if not (1 <= punt <= 5):
        return jsonify({'error': 'Puntaje debe ser entre 1 y 5'}), 400

    ok, msg = validar_resena_unica(id_reserva, ci_participante)
    if not ok:
        return jsonify({'error': msg}), 400

    try:
        cursor.execute("""
            INSERT INTO resena (id_reserva, ci_participante, puntaje_general, descripcion)
            VALUES (%s, %s, %s, %s)
        """, (id_reserva, ci_participante, punt, descripcion))

        cursor.execute("""
                       UPDATE reservaParticipante
                       SET resenado = TRUE
                       WHERE id_reserva = %s
                         AND ci_participante = %s
                       """, (id_reserva, ci_participante))

        _recalcular_puntaje_sala(conection, id_reserva)

        conection.commit()
        return jsonify({'mensaje': 'Reseña registrada y puntaje actualizado correctamente'}), 201

    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

@resenias_bp.route('/modificar/<int:id>', methods=['PUT'])
@verificar_token
@requiere_rol('Administrador','Funcionario')
def modificarResenia(id):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    data = request.get_json()

    ci_participante = data.get("ci_participante")
    id_reserva = data.get("id_reserva")
    puntaje_general = data.get("puntaje_general")
    descripcion = data.get("descripcion")

    if not all([ci_participante, id_reserva, puntaje_general]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    if not validar_ci(ci_participante):
        return jsonify({'error': 'Cédula inválida'}), 400

    try:
        punt = int(puntaje_general)
    except Exception:
        return jsonify({'error': 'Puntaje debe ser un número entre 1 y 5'}), 400

    if not (1 <= punt <= 5):
        return jsonify({'error': 'Puntaje debe ser entre 1 y 5'}), 400

    try:
        cursor.execute("SELECT id_reserva, ci_participante FROM resena WHERE id_resena = %s", (id,))
        actual = cursor.fetchone()
        if not actual:
            return jsonify({'mensaje': 'Reseña no encontrada'}), 404

        old_id_reserva = actual["id_reserva"]
        old_ci = actual["ci_participante"]

        if int(id_reserva) != int(old_id_reserva) or int(ci_participante) != int(old_ci):
            ok, msg = validar_resena_unica(id_reserva, ci_participante)
            if not ok:
                return jsonify({'error': msg}), 400

        cur2 = conection.cursor()
        cur2.execute("""
                     UPDATE resena
                     SET ci_participante = %s,
                         id_reserva      = %s,
                         puntaje_general = %s,
                         descripcion     = %s
                     WHERE id_resena = %s
                     """, (ci_participante, id_reserva, punt, descripcion, id))

        if int(id_reserva) != int(old_id_reserva) or int(ci_participante) != int(old_ci):
            cur2.execute("""
                         UPDATE reservaParticipante
                         SET resenado = FALSE
                         WHERE id_reserva = %s
                           AND ci_participante = %s
                         """, (old_id_reserva, old_ci))
            cur2.execute("""
                         UPDATE reservaParticipante
                         SET resenado = TRUE
                         WHERE id_reserva = %s
                           AND ci_participante = %s
                         """, (id_reserva, ci_participante))

        _recalcular_puntaje_sala(conection, old_id_reserva)
        _recalcular_puntaje_sala(conection, id_reserva)

        conection.commit()
        return jsonify({'mensaje': 'Reseña modificada correctamente'}), 200
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

@resenias_bp.route('/eliminar/<int:id>', methods=['DELETE'])
@verificar_token
@requiere_rol('Administrador','Funcionario')
def eliminarResenia(id):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id_reserva, ci_participante FROM resena WHERE id_resena = %s", (id,))
        info = cursor.fetchone()
        if not info:
            return jsonify({'mensaje': 'Reseña no encontrada'}), 404

        id_reserva = info["id_reserva"]
        ci = info["ci_participante"]

        cur2 = conection.cursor()
        cur2.execute("DELETE FROM resena WHERE id_resena = %s", (id,))

        cur2.execute("""
                     UPDATE reservaParticipante
                     SET resenado = FALSE
                     WHERE id_reserva = %s
                       AND ci_participante = %s
                     """, (id_reserva, ci))

        _recalcular_puntaje_sala(conection, id_reserva)

        conection.commit()
        return jsonify({'mensaje': 'Reseña eliminada correctamente'}), 200
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()