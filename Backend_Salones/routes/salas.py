from flask import Blueprint, jsonify, request
from db import get_connection
from validation import verificar_token, requiere_rol
from validators import validar_disponibilidad_sala
salas_bp = Blueprint('salas', __name__, url_prefix='/salas')

@salas_bp.route('/all', methods=['GET'])
@verificar_token
def obtener_todas_las_salas():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM salasDeEstudio")
        resultados = cursor.fetchall()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@salas_bp.route('/disponibles', methods=['GET'])
@verificar_token
def obtener_salas_disponibles():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM salasDeEstudio WHERE disponible = TRUE")
        resultados = cursor.fetchall()
        return jsonify(resultados)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()
        
@salas_bp.route('/<string:nombre_sala>/<string:edificio>', methods=['GET'])
@verificar_token
def obtener_sala(nombre_sala, edificio):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT * FROM salasDeEstudio
            WHERE nombre_sala = %s AND edificio = %s
        """, (nombre_sala, edificio))
        sala = cursor.fetchone()
        if sala:
            return jsonify(sala)
        return jsonify({'mensaje': 'Sala no encontrada'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


@salas_bp.route('/buscar/<string:nombre_sala>', methods=['GET'])
@verificar_token
def buscar_salas_por_nombre(nombre_sala):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT * FROM salasDeEstudio
            WHERE nombre_sala = %s
        """, (nombre_sala,))
        salas = cursor.fetchall()
        if salas:
            return jsonify(salas)
        return jsonify({'mensaje': 'No se encontraron salas con ese nombre'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


@salas_bp.route('/<string:edificio>', methods=['GET'])
@verificar_token
def obtener_salas_edificio(edificio):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT * FROM salasDeEstudio
            WHERE edificio = %s
        """, (edificio,))
        salas = cursor.fetchall()
        if salas:
            return jsonify(salas)
        return jsonify({'mensaje': 'Edificio no Tiene salas'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


@salas_bp.route('/registrar', methods=['POST'])
@verificar_token
@requiere_rol('Administrador')
def crear_sala():
    data = request.get_json()
    nombre_sala = data.get('nombre_sala')
    edificio = data.get('edificio')
    capacidad = data.get('capacidad')
    tipo_sala = data.get('tipo_sala')
    puntaje = data.get('puntaje', 3)

    if not all([nombre_sala, edificio, capacidad, tipo_sala]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    if tipo_sala not in ('Libre', 'Posgrado', 'Docente'):
        return jsonify({'error': 'tipo_sala inválido'}), 400

    try:
        capacidad_int = int(capacidad)
        if capacidad_int <= 0:
            raise ValueError
    except Exception:
        return jsonify({'error': 'Capacidad debe ser un número entero positivo mayor a 0'}), 400

    if capacidad_int <= 0:
        return jsonify({'error': 'Capacidad debe ser mayor a 0'}), 400

    try:
        punt = int(puntaje)
        if not (1 <= punt <= 5):
            raise ValueError
    except Exception:
        return jsonify({'error': 'Puntaje debe ser un número entre 1 y 5'}), 400

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
                       SELECT COUNT(*) AS existe
                       FROM salasDeEstudio
                       WHERE nombre_sala = %s
                         AND edificio = %s
                       """, (nombre_sala, edificio))
        existe = cursor.fetchone()['existe']

        if existe > 0:
            return jsonify({'error': 'La sala ya existe en este edificio'}), 400

        cursor.execute("""
                       INSERT INTO salasDeEstudio (nombre_sala, edificio, capacidad, tipo_sala, puntaje)
                       VALUES (%s, %s, %s, %s, %s)
                       """, (nombre_sala, edificio, capacidad_int, tipo_sala, punt))
        connection.commit()

        return jsonify({'mensaje': 'Sala creada correctamente'}), 201

    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()


#Falta revisar posible prevencion de que la sala ya se encuentre en el sistema


@salas_bp.route('/<string:nombre_sala>/<string:edificio>', methods=['PUT'])
@verificar_token
@requiere_rol('Administrador')
def actualizar_sala(nombre_sala, edificio):
    data = request.get_json()
    capacidad = data.get('capacidad')
    tipo_sala = data.get('tipo_sala')
    disponible = data.get('disponible')
    puntaje = data.get('puntaje')

    if capacidad is None and tipo_sala is None and disponible is None and puntaje is None:
        return jsonify({'error': 'No hay campos para actualizar'}), 400

    if capacidad is not None:
        try:
            capacidad_int = int(capacidad)
            if capacidad_int <= 0:
                return jsonify({'error': 'Capacidad debe ser mayor a 0'}), 400
        except Exception:
            return jsonify({'error': 'Capacidad debe ser un número entero positivo'}), 400
    else:
        capacidad_int = None

    if puntaje is not None:
        try:
            punt = int(puntaje)
            if not (1 <= punt <= 5):
                return jsonify({'error': 'Puntaje debe ser entre 1 y 5'}), 400
        except Exception:
            return jsonify({'error': 'Puntaje debe ser un número entre 1 y 5'}), 400
    else:
        punt = None

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            UPDATE salasDeEstudio
            SET capacidad = %s, tipo_sala = %s, disponible = %s, puntaje = %s
            WHERE nombre_sala = %s AND edificio = %s
        """, (capacidad, tipo_sala, disponible, puntaje, nombre_sala, edificio))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Sala no encontrada'}), 404

        return jsonify({'mensaje': 'Sala actualizada correctamente'})
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@salas_bp.route('/<string:nombre_sala>/<string:edificio>', methods=['DELETE'])
@verificar_token
@requiere_rol('Administrador')
def eliminar_sala(nombre_sala, edificio):
    connection = get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("""
            DELETE FROM salasDeEstudio
            WHERE nombre_sala = %s AND edificio = %s
        """, (nombre_sala, edificio))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Sala no encontrada'}), 404

        return jsonify({'mensaje': 'Sala eliminada correctamente'})
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

@salas_bp.route('/disponibilidad', methods=['PATCH'])
@verificar_token
def cambiar_disponibilidad_sala():
    data = request.get_json()
    nombre_sala = data.get('nombre_sala')
    edificio = data.get('edificio')
    disponible = data.get('disponible')

    if not all([nombre_sala, edificio, disponible is not None]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
            UPDATE salasDeEstudio
            SET disponible = %s
            WHERE nombre_sala = %s AND edificio = %s
        """, (disponible, nombre_sala, edificio))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({'mensaje': 'Sala no encontrada'}), 404

        return jsonify({'mensaje': 'Disponibilidad de la sala actualizada correctamente'})
    except Exception as e:
        connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        connection.close()

