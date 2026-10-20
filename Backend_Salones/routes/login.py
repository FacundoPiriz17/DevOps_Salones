import jwt
from flask import Blueprint, request, jsonify
import datetime
from db import get_connection
from hash_function import hasheo, verificar_contrasena
from validation import requiere_rol, verificar_token
from validators import validar_ci, validar_email_ucu
from config import SECRET_KEY

login_bp = Blueprint('login', __name__, url_prefix='/login')

@login_bp.route('/registro', methods=['POST'])
@verificar_token
@requiere_rol('Administrador')
def registrar_usuario():
    data = request.get_json()
    ci = data.get('ci')
    nombre = data.get('nombre')
    apellido = data.get('apellido')
    email = data.get('email')
    rol = data.get('rol')
    contrasena = data.get('contrasena')

    programa = data.get('programa') or {}
    programas_input = data.get('programas') or []

    lista_programas = []

    if isinstance(programas_input, list) and programas_input:
        for p in programas_input:
            if not isinstance(p, dict):
                continue
            np = (p.get('nombre_plan') or '').strip()
            ra = (p.get('rol') or '').strip()
            if np and ra:
                lista_programas.append({'nombre_plan': np, 'rol': ra})
    else:
        np = (programa.get('nombre_plan') or '').strip()
        ra = (programa.get('rol') or '').strip()
        if np and ra:
            lista_programas.append({'nombre_plan': np, 'rol': ra})

    if not all([ci, nombre, apellido, email, rol, contrasena]) or \
            not all(str(x).strip() for x in [ci, nombre, apellido, email, rol, contrasena]):
        return jsonify({'error': 'Datos insuficientes'}), 400

    if not validar_ci(ci):
        return jsonify({'error': 'Cédula inválida'}), 400

    if not validar_email_ucu(email):
        return jsonify({'error': 'Email no válido. Debe ser @correo.ucu.edu.uy o @ucu.edu.uy'}), 400

    if rol not in ('Participante', 'Funcionario', 'Administrador'):
        return jsonify({'error': "Rol inválido. Use 'Participante', 'Funcionario' o 'Administrador'"}), 400

    requiere_programa = (rol == 'Participante')

    if requiere_programa:
        if not lista_programas:
            return jsonify({
                'error': 'Faltan datos de programa académico: se requiere al menos un plan con rol académico'
            }), 400

        for p in lista_programas:
            if p['rol'] not in ('Alumno', 'Docente'):
                return jsonify({
                    'error': "Rol académico inválido. Use 'Alumno' o 'Docente' en todos los programas"
                }), 400

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("SELECT 1 FROM usuario WHERE ci = %s AND email = %s LIMIT 1", (ci, email))
        if cur.fetchone():
            return jsonify({'error': 'Ya existe un usuario con esa CI y email'}), 400

        cur2 = con.cursor()
        cur2.execute(
            "INSERT INTO usuario (ci, nombre, apellido, email, rol) VALUES (%s, %s, %s, %s, %s)",
            (ci, nombre.strip(), apellido.strip(), email.strip(), rol)
        )

        contrasena_hasheada = hasheo(contrasena)
        cur2.execute(
            "INSERT INTO login (email, contrasena) VALUES (%s, %s)",
            (email.strip(), contrasena_hasheada)
        )

        if requiere_programa:
            for p in lista_programas:
                nombre_plan = p['nombre_plan']
                rol_academico = p['rol']

                cur2.execute(
                    "SELECT 1 FROM planAcademico WHERE nombre_plan = %s LIMIT 1",
                    (nombre_plan,)
                )
                if cur2.fetchone() is None:
                    con.rollback()
                    return jsonify({
                        'error': f'El plan académico indicado no existe: {nombre_plan}'
                    }), 400

                cur2.execute("""
                    SELECT 1
                    FROM participanteProgramaAcademico
                    WHERE ci_participante = %s
                      AND nombre_plan = %s
                    LIMIT 1
                """, (ci, nombre_plan))
                if cur2.fetchone():
                    con.rollback()
                    return jsonify({
                        'error': f'El participante ya está asociado al plan académico: {nombre_plan}'
                    }), 400

            for p in lista_programas:
                cur2.execute("""
                    INSERT INTO participanteProgramaAcademico (ci_participante, nombre_plan, rol)
                    VALUES (%s, %s, %s)
                """, (ci, p['nombre_plan'], p['rol']))

        con.commit()
        return jsonify({'respuesta': 'Usuario creado correctamente'}), 201

    except Exception as e:
        con.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cur.close()
        con.close()


@login_bp.route('/usuarios', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario')
def obtener_usuarios():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT ci, nombre, apellido, email, rol FROM usuario")
        usuarios = cursor.fetchall()
        return jsonify(usuarios), 200
    except Exception as e:
        return jsonify({'error': str(e)}, 400)
    finally:
        cursor.close()
        connection.close()

@login_bp.route('/usuarios/<int:ci>', methods=['GET'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario', 'Participante')
def obtener_usuario_por_ci(ci):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("""
                       SELECT ci, nombre, apellido, email, rol
                       FROM usuario
                       WHERE ci = %s
                       """, (ci,))
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        programas = []
        if usuario["rol"] == "Participante":
            cursor.execute("""
                           SELECT ppa.nombre_plan, ppa.rol
                           FROM participanteProgramaAcademico ppa
                           WHERE ppa.ci_participante = %s
                           """, (ci,))
            programas = cursor.fetchall()

        usuario["programas"] = programas
        return jsonify(usuario), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400

    finally:
        cursor.close()
        connection.close()

@login_bp.route('/usuarios/<int:ci>', methods=['PUT'])
@verificar_token
@requiere_rol('Administrador', 'Funcionario', 'Participante')
def actualizar_usuario(ci):
    data = request.get_json()
    nombre = data.get('nombre')
    apellido = data.get('apellido')
    email = data.get('email')
    rol = data.get('rol')
    contrasena = data.get('contrasena')
    programas = data.get('programas', [])  # [{nombre_plan, rol}, ...]

    if not all([nombre, apellido, email, rol]) or not all(str(x).strip() for x in [nombre, apellido, email, rol]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    if not validar_email_ucu(email):
        return jsonify({'error': 'Email no válido. Debe ser @correo.ucu.edu.uy o @ucu.edu.uy'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT ci, nombre, apellido, email, rol
            FROM usuario
            WHERE ci = %s
        """, (ci,))
        row = cursor.fetchone()

        if not row:
            return jsonify({'error': f'Usuario no encontrado (ci={ci})'}), 404

        old_rol = row["rol"]

        cursor.execute("""
            UPDATE usuario
               SET nombre   = %s,
                   apellido = %s,
                   email    = %s,
                   rol      = %s
             WHERE ci = %s
        """, (nombre, apellido, email, rol, ci))

        if contrasena:
            contrasena_hasheada = hasheo(contrasena)
            cursor.execute("""
                UPDATE login
                   SET contrasena = %s
                 WHERE email = %s
            """, (contrasena_hasheada, email))

        if rol == 'Participante':
            cursor.execute("""
                DELETE FROM participanteProgramaAcademico
                 WHERE ci_participante = %s
            """, (ci,))

            for p in programas or []:
                nombre_plan = p.get("nombre_plan")
                rol_acad = p.get("rol")
                if not nombre_plan or not rol_acad:
                    continue
                cursor.execute("""
                    INSERT INTO participanteProgramaAcademico (ci_participante, nombre_plan, rol)
                    VALUES (%s, %s, %s)
                """, (ci, nombre_plan, rol_acad))

        else:
            if old_rol == 'Participante':
                cursor.execute("""
                    DELETE FROM participanteProgramaAcademico
                     WHERE ci_participante = %s
                """, (ci,))

        conn.commit()
        return jsonify({'mensaje': 'Usuario actualizado correctamente'}), 200

    except Exception as e:
        conn.rollback()
        print("ERROR actualizar_usuario:", e)
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@login_bp.route('/usuarios/<int:ci>', methods=['DELETE'])
@verificar_token
@requiere_rol('Administrador')
def eliminar_usuario(ci):
    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("SELECT email, activo FROM usuario WHERE ci = %s", (ci,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        if not row["activo"]:
            return jsonify({'mensaje': 'El usuario ya estaba inactivo'}), 200

        cur.execute("UPDATE usuario SET activo = FALSE WHERE ci = %s", (ci,))
        if cur.rowcount == 0:
            con.rollback()
            return jsonify({'error': 'Usuario no encontrado'}), 404

        con.commit()
        return jsonify({'mensaje': 'Usuario desactivado correctamente'}), 200

    except Exception as e:
        con.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        con.close()


@login_bp.route('/inicio', methods=['POST'])
def login_usuario():
    data = request.get_json()
    email = data.get('email')
    contrasena = data.get('contrasena')

    if not all([email, contrasena]):
        return jsonify({'error': 'Faltan datos requeridos'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
                    SELECT u.ci, u.nombre, u.apellido, u.email, u.rol, u.activo, l.contrasena
                    FROM usuario u
                             JOIN login l ON u.email = l.email
                    WHERE u.email = %s
                    """, (email,))
        usuario = cursor.fetchone()

        if not usuario or not usuario["activo"]:
            return jsonify({'error': 'Credenciales inválidas'}), 401

        if usuario and verificar_contrasena(contrasena, usuario['contrasena']):
            token = jwt.encode(
                {
                    "ci": usuario["ci"],
                    "email": usuario["email"],
                    "rol": usuario["rol"],
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
                },
                SECRET_KEY,
                algorithm="HS256"
            )

            del usuario['contrasena']

            return jsonify({
                'mensaje': 'Inicio de sesión exitoso',
                'usuario': usuario,
                'token': token
            }), 200
        else:
            return jsonify({'error': 'Credenciales inválidas'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@login_bp.route('/me', methods=['GET'])
@verificar_token
@requiere_rol('Participante', 'Funcionario', 'Administrador')
def obtener_mi_usuario():
    user = getattr(request, 'usuario_actual', {}) or {}
    ci = user.get('ci')

    if not ci:
        return jsonify({"error": "No se pudo obtener la cédula desde el token"}), 400

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT ci, nombre, apellido, email, rol
            FROM usuario
            WHERE ci = %s
        """, (ci,))
        usuario = cur.fetchone()

        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        programas = []
        if usuario["rol"] == "Participante":
            cur.execute("""
                SELECT pa.nombre_plan, pa.tipo, ppa.rol
                FROM participanteProgramaAcademico ppa
                JOIN planAcademico pa ON pa.nombre_plan = ppa.nombre_plan
                WHERE ppa.ci_participante = %s
            """, (ci,))
            programas = cur.fetchall()

        cur.execute("""
            SELECT id_sancion, motivo, fecha_inicio, fecha_fin
            FROM sancion_participante
            WHERE ci_participante = %s
              AND CURDATE() BETWEEN fecha_inicio AND fecha_fin
            ORDER BY fecha_fin DESC
        """, (ci,))
        sanciones = cur.fetchall()

        return jsonify({
            "usuario": usuario,
            "programas": programas,
            "sanciones_activas": sanciones
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@login_bp.route('/cambiar-contrasena', methods=['POST'])
@verificar_token
@requiere_rol('Participante', 'Funcionario', 'Administrador')
def cambiar_contrasena():
    user = getattr(request, 'usuario_actual', {}) or {}
    email = user.get("email")

    data = request.get_json()
    actual = data.get("contrasena_actual")
    nueva = data.get("contrasena_nueva")

    if not all([actual, nueva]):
        return jsonify({"error": "Faltan datos requeridos"}), 400

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        # Obtener contraseña actual
        cur.execute("""
            SELECT contrasena
            FROM login
            WHERE email = %s
        """, (email,))
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if not verificar_contrasena(actual, row["contrasena"]):
            return jsonify({"error": "La contraseña actual es incorrecta"}), 400

        nueva_hash = hasheo(nueva)
        cur2 = con.cursor()
        cur2.execute("""
            UPDATE login
            SET contrasena = %s
            WHERE email = %s
        """, (nueva_hash, email))

        con.commit()

        return jsonify({"mensaje": "Contraseña actualizada correctamente"}), 200

    except Exception as e:
        con.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        con.close()

@login_bp.route('/renovar-token', methods=['POST'])
@verificar_token
@requiere_rol('Participante', 'Funcionario', 'Administrador')
def renovar_token():

    user = getattr(request, 'usuario_actual', {}) or {}
    ci = user.get("ci")
    email = user.get("email")
    rol = user.get("rol")

    if not all([ci, email, rol]):
        return jsonify({"error": "No se pudo obtener la información del usuario desde el token"}), 400

    try:
        nueva_exp = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        nuevo_token = jwt.encode(
            {
                "ci": ci,
                "email": email,
                "rol": rol,
                "exp": nueva_exp
            },
            SECRET_KEY,
            algorithm="HS256"
        )

        if isinstance(nuevo_token, bytes):
            nuevo_token = nuevo_token.decode("utf-8")

        return jsonify({
            "mensaje": "Token renovado correctamente",
            "token": nuevo_token,
            "exp": nueva_exp.isoformat() + "Z"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500