from flask import Blueprint, jsonify, request
from db import get_connection
from validation import verificar_token, requiere_rol
from datetime import datetime, date, time, timedelta
from validators import validate_turno_rango
from decimal import Decimal

turno_bp = Blueprint('/turnos', __name__, url_prefix='/turnos')

def serialize_turno(row):
    if row is None:
        return None

    result = dict(row)

    for k, v in result.items():
        if isinstance(v, (datetime, date, time)):
            result[k] = v.isoformat()

        elif isinstance(v, timedelta):
            total_seconds = int(v.total_seconds())
            horas = total_seconds // 3600
            minutos = (total_seconds % 3600) // 60
            segundos = total_seconds % 60

            result[k] = f"{horas:02}:{minutos:02}:{segundos:02}"

        elif isinstance(v, Decimal):
            result[k] = float(v)

    return result

#Todos los turnos
@turno_bp.route('/all', methods=['GET'])
@verificar_token
def turnos():
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM turno")
        filas = cursor.fetchall()
        turnos_serializados = [serialize_turno(fila) for fila in filas]
        return jsonify(turnos_serializados), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

@turno_bp.route('/turno/<int:id>', methods=['GET'])
@verificar_token
def turnoEspecifico(id):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM turno WHERE id_turno = %s", (id,) )
        turno = cursor.fetchone()
        if turno:
            turno_serializado = serialize_turno(turno)
            return jsonify(turno_serializado), 200
        else:
            return jsonify({'mensaje': 'Turno no encontrado'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

@turno_bp.route("", methods=["POST"])
@verificar_token
@requiere_rol('Administrador')
def crear_turno():
    data = request.get_json() or {}
    hora_inicio = data.get("hora_inicio")
    hora_fin = data.get("hora_fin")

    conn = None
    cur = None
    try:
        if not hora_inicio or not hora_fin:
            raise ValueError("Faltan campos: hora_inicio, hora_fin.")
        validate_turno_rango(hora_inicio, hora_fin)

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO turno (hora_inicio, hora_fin) VALUES (%s, %s)",
            (hora_inicio, hora_fin),
        )
        conn.commit()
        return jsonify({"id_turno": cur.lastrowid}), 201

    except ValueError as ve:
        if conn: conn.rollback()
        return jsonify({"error": str(ve)}), 400

    except Exception:
        if conn: conn.rollback()
        return jsonify({"error": "Error interno"}), 500

    finally:
        if cur:
            try:
                cur.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass