from flask import Blueprint, jsonify, request
from db import get_connection
from validators import validar_ci, validate_sancion_dates
from validation import verificar_token, requiere_rol

sanciones_bp = Blueprint('sanciones', __name__, url_prefix='/sanciones')

#Todas las sanciones
@sanciones_bp.route('/all', methods=['GET'])
@verificar_token
@requiere_rol('Administrador','Funcionario')
def sanciones():
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                s.id_sancion,
                s.ci_participante,
                CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
                s.motivo,
                s.fecha_inicio,
                s.fecha_fin
            FROM sancion_participante s
            JOIN usuario u ON u.ci = s.ci_participante
            ORDER BY s.fecha_inicio DESC;
        """)
        resultados = cursor.fetchall()  # Obtiene TODAS las filas del resultado
        return jsonify(resultados)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()
        
@sanciones_bp.route('/sancion/<int:id>', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def sancionEspecifica(id):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                s.id_sancion,
                s.ci_participante,
                CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
                s.motivo,
                s.fecha_inicio,
                s.fecha_fin
            FROM sancion_participante s
            JOIN usuario u ON u.ci = s.ci_participante
            ORDER BY s.fecha_inicio DESC;
         WHERE id_sancion = %s""", (id,) )
        sancion = cursor.fetchone()  
        if sancion:
            return jsonify(sancion)
        else:
            return jsonify({'mensaje': 'Sanción no encontrada'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

@sanciones_bp.route('/registrar', methods=['POST'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def aniadirSancion():
    conection = get_connection()
    cursor = conection.cursor()
    data = request.get_json()
    ci_participante = data.get("ci_participante")
    motivo = data.get("motivo")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")

    if not all([ci_participante, motivo, fecha_inicio, fecha_fin]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    if not validar_ci(ci_participante):
        return jsonify({'error': 'Cédula inválida'}), 400
    try:
        validate_sancion_dates(fecha_inicio, fecha_fin)
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400

    cur2 = conection.cursor(dictionary=True)
    cur2.execute("""
                 SELECT 1
                 FROM sancion_participante
                 WHERE ci_participante = %s
                   AND CURDATE() BETWEEN fecha_inicio AND fecha_fin LIMIT 1
                 """, (ci_participante,))
    if cur2.fetchone():
        cur2.close();
        conection.close()
        return jsonify({"error": "El participante ya tiene una sanción activa"}), 400
    cur2.close()

    try:
        cursor.execute(
            "INSERT INTO sancion_participante (ci_participante, motivo, fecha_inicio, fecha_fin) VALUES (%s,%s,%s,%s)",
            (ci_participante, motivo, fecha_inicio, fecha_fin))
        conection.commit()
        return jsonify({'mensaje': 'Sanción registrada correctamente'}), 201
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

@sanciones_bp.route('/modificar/<int:id>', methods=['PUT'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def modificarSancion(id):
    conection = get_connection()
    cursor = conection.cursor()
    data = request.get_json()
    ci_participante = data.get("ci_participante")
    motivo = data.get("motivo")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")

    if not all([ci_participante, motivo, fecha_inicio, fecha_fin]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    if not validar_ci(ci_participante):
        return jsonify({'error': 'Cédula inválida'}), 400
    try:
        validate_sancion_dates(fecha_inicio, fecha_fin)
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400

    try:
        cursor.execute("""
                       UPDATE sancion_participante
                       SET ci_participante = %s,
                           motivo          = %s,
                           fecha_inicio    = %s,
                           fecha_fin       = %s
                       WHERE id_sancion = %s
                       """, (ci_participante, motivo, fecha_inicio, fecha_fin, id))
        conection.commit()
        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Sanción no encontrada'}), 404
        return jsonify({'mensaje': 'Sanción modificada correctamente'}), 200
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()


@sanciones_bp.route('/eliminar/<int:id>', methods=['DELETE'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def eliminarSancion(id):
    conection = get_connection()
    cursor = conection.cursor()
    try:
        cursor.execute("DELETE FROM sancion_participante WHERE id_sancion = %s", (id,))
        conection.commit()
        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Sanción no encontrada'}), 404
        return jsonify({'mensaje':'Sanción eliminada correctamente'}), 200
    except Exception as e:
        conection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conection.close()

@sanciones_bp.route('/mias', methods=['GET'])
@verificar_token
@requiere_rol('Participante', 'Funcionario', 'Administrador')
def mis_sanciones():
    user = getattr(request, 'usuario_actual', {}) or {}
    ci = user.get("ci")

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT id_sancion, motivo, fecha_inicio, fecha_fin,
                   CURDATE() BETWEEN fecha_inicio AND fecha_fin AS activa
            FROM sancion_participante
            WHERE ci_participante = %s
            ORDER BY fecha_inicio DESC
        """, (ci,))
        sanciones = cur.fetchall()

        return jsonify(sanciones), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()