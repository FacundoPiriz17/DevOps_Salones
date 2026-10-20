from datetime import datetime, timedelta, timezone

import jwt
import pytest

import config
import routes.login as login_routes
from hash_function import hasheo, verificar_contrasena


def test_root_and_preflight_do_not_need_database(client):
    response = client.get('/')
    assert response.status_code == 200
    assert 'DevOps' in response.get_data(as_text=True)
    response = client.options('/reservas/registrar', headers={'Origin': 'http://localhost:5173'})
    assert response.status_code == 200
    assert response.headers['Access-Control-Allow-Origin'] == 'http://localhost:5173'


@pytest.mark.parametrize('header', [None, 'Basic abc', 'Bearer invalid.jwt.token'])
def test_protected_endpoint_rejects_missing_or_invalid_token(client, header):
    response = client.get('/salas/all', headers={'Authorization': header} if header else {})
    assert response.status_code == 401


def test_expired_token(client, auth_headers):
    headers = auth_headers(exp=datetime.now(timezone.utc) - timedelta(minutes=1))
    assert client.get('/salas/all', headers=headers).status_code == 401


def test_token_signed_with_another_key(client):
    token = jwt.encode({'rol': 'Administrador'}, 'different-test-key', algorithm='HS256')
    assert client.get('/login/usuarios', headers={'Authorization': f'Bearer {token}'}).status_code == 401


@pytest.mark.parametrize('role', ['Participante', 'Funcionario', 'Unknown'])
def test_only_admin_can_register_users(client, auth_headers, role):
    response = client.post('/login/registro', json={}, headers=auth_headers(role))
    assert response.status_code == 403


@pytest.mark.parametrize('body', [{}, {'email': 'qa@ucu.edu.uy'}, {'contrasena': 'test'}])
def test_login_requires_both_credentials(client, body):
    assert client.post('/login/inicio', json=body).status_code == 400


@pytest.fixture(scope='module')
def password_hash():
    return hasheo('test-password-2026')


def test_password_hash_is_salted_and_rejects_wrong_password(password_hash):
    assert password_hash != 'test-password-2026'
    assert verificar_contrasena('test-password-2026', password_hash)
    assert not verificar_contrasena('wrong-password', password_hash)


@pytest.mark.parametrize('role', ['Administrador', 'Funcionario', 'Participante'])
def test_login_issues_signed_token_without_password(client, database, monkeypatch, password_hash, role):
    connection, cursor = database
    cursor.fetchone.return_value = {
        'ci': 90000303, 'nombre': 'Prueba', 'apellido': 'Usuario',
        'email': 'qa@ucu.edu.uy', 'rol': role, 'activo': True, 'contrasena': password_hash,
    }
    monkeypatch.setattr(login_routes, 'get_connection', lambda: connection)
    response = client.post('/login/inicio', json={'email': 'qa@ucu.edu.uy', 'contrasena': 'test-password-2026'})
    assert response.status_code == 200
    payload = response.get_json()
    assert 'contrasena' not in payload['usuario']
    claims = jwt.decode(payload['token'], config.SECRET_KEY, algorithms=['HS256'])
    assert claims['rol'] == role
    assert claims['ci'] == 90000303
    assert claims['exp'] > datetime.now(timezone.utc).timestamp()
    connection.close.assert_called_once()


@pytest.mark.parametrize('user', [None, {'activo': False}])
def test_unknown_or_inactive_user_cannot_login(client, database, monkeypatch, user):
    connection, cursor = database
    cursor.fetchone.return_value = user
    monkeypatch.setattr(login_routes, 'get_connection', lambda: connection)
    response = client.post('/login/inicio', json={'email': 'qa@ucu.edu.uy', 'contrasena': 'wrong-password'})
    assert response.status_code == 401
    assert 'token' not in response.get_json()


def test_wrong_password_cannot_login(client, database, monkeypatch, password_hash):
    connection, cursor = database
    cursor.fetchone.return_value = {'activo': True, 'contrasena': password_hash}
    monkeypatch.setattr(login_routes, 'get_connection', lambda: connection)
    response = client.post('/login/inicio', json={'email': 'qa@ucu.edu.uy', 'contrasena': 'wrong-password'})
    assert response.status_code == 401
