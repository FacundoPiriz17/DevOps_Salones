from flask import Blueprint, jsonify, request
from db import get_connection
from validation import verificar_token, requiere_rol

grupos_bp = Blueprint("grupos", __name__, url_prefix="/grupos")


def _ci_actual():
    usuario = getattr(request, "usuario_actual", {}) or {}
    return usuario.get("ci")


@grupos_bp.route("", methods=["GET"])
@verificar_token
def listar_grupos():
    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT g.studyGroupId, g.studyGroupName, g.status, g.leader,
                   COUNT(gp.member) AS participantCount
              FROM studyGroup g
              LEFT JOIN studyGroupParticipant gp
                ON gp.studyGroupId = g.studyGroupId
             WHERE g.leader = %s OR EXISTS (
                 SELECT 1 FROM studyGroupParticipant mine
                  WHERE mine.studyGroupId = g.studyGroupId
                    AND mine.member = %s
             )
             GROUP BY g.studyGroupId, g.studyGroupName, g.status, g.leader
             ORDER BY g.studyGroupName
        """, (_ci_actual(), _ci_actual()))
        return jsonify(cur.fetchall()), 200
    finally:
        cur.close()
        con.close()


@grupos_bp.route("", methods=["POST"])
@verificar_token
@requiere_rol("Participante")
def crear_grupo():
    data = request.get_json(silent=True) or {}
    nombre = str(data.get("studyGroupName") or data.get("nombre") or "").strip()
    if not nombre or len(nombre) > 50:
        return jsonify({"error": "El nombre del grupo es obligatorio y no puede superar 50 caracteres"}), 400

    con = get_connection()
    cur = con.cursor()
    try:
        cur.execute(
            "INSERT INTO studyGroup (studyGroupName, leader) VALUES (%s, %s)",
            (nombre, _ci_actual()),
        )
        group_id = cur.lastrowid
        cur.execute(
            "INSERT INTO studyGroupParticipant (studyGroupId, member) VALUES (%s, %s)",
            (group_id, _ci_actual()),
        )
        con.commit()
        return jsonify({"studyGroupId": group_id, "mensaje": "Grupo creado correctamente"}), 201
    except Exception as exc:
        con.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        cur.close()
        con.close()


@grupos_bp.route("/<int:group_id>", methods=["GET"])
@verificar_token
def obtener_grupo(group_id):
    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT studyGroupId, studyGroupName, status, leader
              FROM studyGroup
             WHERE studyGroupId = %s
        """, (group_id,))
        grupo = cur.fetchone()
        if not grupo:
            return jsonify({"error": "Grupo no encontrado"}), 404
        cur.execute("""
            SELECT u.ci, u.nombre, u.apellido, u.email
              FROM studyGroupParticipant gp
              JOIN usuario u ON u.ci = gp.member
             WHERE gp.studyGroupId = %s
             ORDER BY u.apellido, u.nombre
        """, (group_id,))
        grupo["participants"] = cur.fetchall()
        return jsonify(grupo), 200
    finally:
        cur.close()
        con.close()


@grupos_bp.route("/<int:group_id>/participantes", methods=["POST"])
@verificar_token
@requiere_rol("Participante")
def agregar_participante(group_id):
    data = request.get_json(silent=True) or {}
    member = data.get("ci") or data.get("member")
    try:
        member = int(member)
    except (TypeError, ValueError):
        return jsonify({"error": "CI del participante inválida"}), 400

    con = get_connection()
    cur = con.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM studyGroup WHERE studyGroupId = %s AND leader = %s AND status = 'Activo'",
            (group_id, _ci_actual()),
        )
        if not cur.fetchone():
            return jsonify({"error": "Solo el líder de un grupo activo puede agregar participantes"}), 403
        cur.execute("SELECT 1 FROM usuario WHERE ci = %s AND rol = 'Participante'", (member,))
        if not cur.fetchone():
            return jsonify({"error": "El participante no existe o no tiene rol Participante"}), 404
        cur.execute(
            "INSERT INTO studyGroupParticipant (studyGroupId, member) VALUES (%s, %s)",
            (group_id, member),
        )
        con.commit()
        return jsonify({"mensaje": "Participante agregado al grupo"}), 201
    except Exception as exc:
        con.rollback()
        if "Duplicate entry" in str(exc):
            return jsonify({"error": "El participante ya pertenece al grupo"}), 400
        return jsonify({"error": str(exc)}), 500
    finally:
        cur.close()
        con.close()


@grupos_bp.route("/<int:group_id>", methods=["PATCH"])
@verificar_token
@requiere_rol("Participante")
def actualizar_grupo(group_id):
    data = request.get_json(silent=True) or {}
    nombre = data.get("studyGroupName")
    status = data.get("status")
    if nombre is None and status is None:
        return jsonify({"error": "Debe indicar studyGroupName o status"}), 400
    if nombre is not None:
        nombre = str(nombre).strip()
        if not nombre or len(nombre) > 50:
            return jsonify({"error": "El nombre del grupo no es válido"}), 400
    if status is not None and status not in ("Activo", "Inactivo"):
        return jsonify({"error": "El estado debe ser Activo o Inactivo"}), 400

    con = get_connection()
    cur = con.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM studyGroup WHERE studyGroupId = %s AND leader = %s",
            (group_id, _ci_actual()),
        )
        if not cur.fetchone():
            return jsonify({"error": "Solo el líder puede modificar el grupo"}), 403
        fields = []
        values = []
        if nombre is not None:
            fields.append("studyGroupName = %s")
            values.append(nombre)
        if status is not None:
            fields.append("status = %s")
            values.append(status)
        values.append(group_id)
        cur.execute(
            f"UPDATE studyGroup SET {', '.join(fields)} WHERE studyGroupId = %s",
            values,
        )
        con.commit()
        return jsonify({"mensaje": "Grupo actualizado correctamente"}), 200
    except Exception as exc:
        con.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        cur.close()
        con.close()


@grupos_bp.route("/<int:group_id>/participantes/<int:member>", methods=["DELETE"])
@verificar_token
@requiere_rol("Participante")
def eliminar_participante(group_id, member):
    con = get_connection()
    cur = con.cursor()
    try:
        cur.execute(
            "SELECT leader FROM studyGroup WHERE studyGroupId = %s AND status = 'Activo'",
            (group_id,),
        )
        grupo = cur.fetchone()
        if not grupo or int(grupo[0]) != int(_ci_actual()):
            return jsonify({"error": "Solo el líder de un grupo activo puede eliminar participantes"}), 403
        if int(member) == int(grupo[0]):
            return jsonify({"error": "El líder debe permanecer en el grupo"}), 400
        cur.execute(
            "DELETE FROM studyGroupParticipant WHERE studyGroupId = %s AND member = %s",
            (group_id, member),
        )
        if cur.rowcount == 0:
            return jsonify({"error": "El participante no pertenece al grupo"}), 404
        con.commit()
        return jsonify({"mensaje": "Participante eliminado del grupo"}), 200
    except Exception as exc:
        con.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        cur.close()
        con.close()
