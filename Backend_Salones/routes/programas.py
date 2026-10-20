from flask import Blueprint, jsonify
from db import get_connection
from validation import verificar_token, requiere_rol

programas_bp = Blueprint('programas', __name__, url_prefix='/programas')

@programas_bp.route('/all', methods=['GET'])
@verificar_token
@requiere_rol('Administrador')
def obtener_planes_academicos():
    con = get_connection()
    cur = con.cursor(dictionary=True)

    try:
        cur.execute("""
            SELECT 
                pa.nombre_plan,
                pa.tipo,
                pa.id_Facultad,
                f.nombre_facultad
            FROM planAcademico pa
            JOIN facultad f ON f.id_Facultad = pa.id_Facultad
            ORDER BY pa.nombre_plan ASC;
        """)

        planes = cur.fetchall()

        return jsonify({
            "planes": planes,
            "total": len(planes)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        con.close()
