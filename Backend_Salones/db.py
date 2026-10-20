import mysql.connector
from config import (
    DB_HOST, DB_NAME,
    DB_LOGIN, DB_LOGIN_PASSWORD,
    DB_ADMIN_USER, DB_ADMIN_PASSWORD,
    DB_FUNC_USER, DB_FUNC_PASSWORD,
    DB_PART_USER, DB_PART_PASSWORD,
)
from flask import has_request_context, request

def get_connection(rol=None):

    # Si no se proporciona rol, intentar obtenerlo del request actual
    if rol is None and has_request_context():
        user = getattr(request, 'usuario_actual', {}) or {}
        rol = user.get('rol')

    if rol == "Administrador":
        user, pwd = DB_ADMIN_USER, DB_ADMIN_PASSWORD
    elif rol == "Funcionario":
        user, pwd = DB_FUNC_USER, DB_FUNC_PASSWORD
    elif rol == "Participante":
        user, pwd = DB_PART_USER, DB_PART_PASSWORD
    else:
        user, pwd = DB_LOGIN, DB_LOGIN_PASSWORD

    return mysql.connector.connect(
        host=DB_HOST,
        user=user,
        password=pwd,
        database=DB_NAME,
        auth_plugin='mysql_native_password'
    )
