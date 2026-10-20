from functools import wraps
from flask import request, jsonify
import jwt
from config import SECRET_KEY

def verificar_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({"error": "Token faltante o formato inválido"}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except Exception:
            return jsonify({"error": "Token inválido"}), 401

        request.usuario_actual = {
            "ci": data.get("ci"),
            "email": data.get("email"),
            "rol": data.get("rol"),
        }

        return func(*args, **kwargs)

    return wrapper


def requiere_rol(*roles_permitidos):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = getattr(request, "usuario_actual", None)
            if not user:
                return jsonify({"error": "Usuario no autenticado"}), 401

            rol = user.get("rol")
            if rol not in roles_permitidos:
                return jsonify({"error": "No autorizado"}), 403

            return func(*args, **kwargs)

        return wrapper
    return decorator
