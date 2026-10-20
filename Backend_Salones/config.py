import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME", "DevOpsSalones")

SECRET_KEY = os.getenv("SECRET_KEY", "default_key_insegura")

DB_APP_USER = os.getenv("DB_APP_USER", "ucurooms_app")
DB_APP_PASSWORD = os.getenv("DB_APP_PASSWORD", "ucurooms_password")

DB_ADMIN_USER = os.getenv("DB_ADMIN_USER", "ucurooms_admin")
DB_ADMIN_PASSWORD = os.getenv("DB_ADMIN_PASSWORD", "admin_pass")

DB_FUNC_USER = os.getenv("DB_FUNC_USER", "ucurooms_funcionario")
DB_FUNC_PASSWORD = os.getenv("DB_FUNC_PASSWORD", "funcionario_pass")

DB_PART_USER = os.getenv("DB_PART_USER", "ucurooms_participante")
DB_PART_PASSWORD = os.getenv("DB_PART_PASSWORD", "participante_pass")

DB_LOGIN = os.getenv("DB_LOGIN", "ucurooms_login")
DB_LOGIN_PASSWORD = os.getenv("DB_LOGIN_PASSWORD", "login_pass")