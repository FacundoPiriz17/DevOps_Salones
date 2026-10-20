from flask import Blueprint, request, jsonify
from db import get_connection
from validation import verificar_token, requiere_rol

edificio_bp = Blueprint('edificios', __name__, url_prefix='/edificios')

@edificio_bp.route('/todos', methods=['GET'])
@verificar_token
def obtener_todos_los_usuarios():
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM edificio")
        resultados = cursor.fetchall()
        cursor.close()
        conection.close()
        return jsonify(resultados)
    except Exception as e:
        cursor.close()
        conection.close()
        return jsonify({'error': str(e)}), 500


@edificio_bp.route('/edificio/<string:nombre>', methods=['GET'])
@verificar_token
def obtener_plan_por_id(nombre):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM edificio WHERE nombre_edificio = %s", (nombre,))
        edificio = cursor.fetchone()
        if edificio:
            return jsonify(edificio)
        else:
            return jsonify({'mensaje': 'Edificio no encontrado'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()

@edificio_bp.route('/campus/<string:campus>', methods=['GET'])
@verificar_token
def obtener_edificio_por_campus(campus):
    conection = get_connection()
    cursor = conection.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM edificio WHERE campus = %s", (campus,))
        edificio = cursor.fetchall()
        if edificio:
            return jsonify(edificio)
        else:
            return jsonify({'mensaje': 'Edificio no encontrado'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conection.close()