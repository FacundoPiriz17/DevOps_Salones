import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier

import pytest

from db import get_connection
from hash_function import hasheo
from validators import ensure_no_solapamiento_de_reserva

pytestmark = pytest.mark.mysql


@pytest.fixture(scope='module')
def mysql_users():
    if os.environ.get('RUN_MYSQL_TESTS') != '1':
        pytest.skip('Run through jenkins/ci.sh integration to use a disposable MySQL database')
    if os.environ.get('CI_DATABASE_DISPOSABLE') != '1' or not os.environ.get('DB_HOST', '').startswith('salones-ci-'):
        pytest.fail('Refusing integration tests outside the isolated CI database')
    users = {
        'Administrador': (90000109, 'ci.admin@ucu.edu.uy'),
        'Funcionario': (90000206, 'ci.staff@ucu.edu.uy'),
        'Participante': (90000303, 'ci.student@ucu.edu.uy'),
    }
    connection = get_connection('Administrador')
    cursor = connection.cursor()
    password_hash = hasheo('test-password-2026')
    for role, (ci, email) in users.items():
        cursor.execute('INSERT INTO usuario (ci,nombre,apellido,email,rol) VALUES (%s,%s,%s,%s,%s)', (ci, 'PruebaCI', 'Integracion', email, role))
        cursor.execute('INSERT INTO login (email,contrasena) VALUES (%s,%s)', (email, password_hash))
    connection.commit()
    cursor.close()
    connection.close()
    return users


def login(client, users, role):
    response = client.post('/login/inicio', json={'email': users[role][1], 'contrasena': 'test-password-2026'})
    assert response.status_code == 200, response.get_json()
    return {'Authorization': f"Bearer {response.get_json()['token']}"}


@pytest.mark.parametrize('role', ['Administrador', 'Funcionario', 'Participante'])
def test_login_profile_and_room_list_with_real_mysql(client, mysql_users, role):
    headers = login(client, mysql_users, role)
    profile = client.get('/login/me', headers=headers)
    assert profile.status_code == 200
    assert profile.get_json()['usuario']['rol'] == role
    rooms = client.get('/salas/all', headers=headers)
    assert rooms.status_code == 200
    assert len(rooms.get_json()) > 0
    creation = client.post('/salas/registrar', headers=headers, json={})
    assert creation.status_code == (400 if role == 'Administrador' else 403)


def test_admin_creates_room_and_commit_is_visible_on_another_connection(client, mysql_users):
    headers = login(client, mysql_users, 'Administrador')
    body = {'nombre_sala': 'QA CI', 'edificio': 'Campus Salto', 'capacidad': 8, 'tipo_sala': 'Libre'}
    response = client.post('/salas/registrar', json=body, headers=headers)
    assert response.status_code == 201, response.get_json()
    assert client.post('/salas/registrar', json=body, headers=headers).status_code == 400
    connection = get_connection('Administrador')
    cursor = connection.cursor()
    cursor.execute('SELECT capacidad FROM salasDeEstudio WHERE nombre_sala=%s AND edificio=%s', ('QA CI', 'Campus Salto'))
    assert cursor.fetchone() == (8,)
    cursor.close()
    connection.close()


def test_participant_creates_reads_and_cancels_booking(client, mysql_users):
    headers = login(client, mysql_users, 'Participante')
    body = {
        'nombre_sala': 'Sala Sal1', 'edificio': 'Campus Salto',
        'fecha': (date.today() + timedelta(days=30)).isoformat(),
        'id_turno': 1, 'ci': mysql_users['Participante'][0], 'estado': 'Activa',
    }
    response = client.post('/reservas/registrar', json=body, headers=headers)
    assert response.status_code == 201, response.get_json()
    booking_id = response.get_json()['id_reserva']
    assert client.get(f'/reservas/detalle/{booking_id}', headers=headers).status_code == 200
    assert client.patch(f'/reservas/cancelar/{booking_id}', headers=headers).status_code == 200
    connection = get_connection('Administrador')
    cursor = connection.cursor()
    cursor.execute('SELECT estado FROM reserva WHERE id_reserva=%s', (booking_id,))
    assert cursor.fetchone() == ('Cancelada',)
    cursor.close()
    connection.close()


def test_student_cannot_cancel_another_users_booking(client, mysql_users):
    admin_headers = login(client, mysql_users, 'Administrador')
    student_headers = login(client, mysql_users, 'Participante')
    response = client.post('/reservas/registrar', headers=admin_headers, json={
        'nombre_sala': 'Sala Sal1', 'edificio': 'Campus Salto',
        'fecha': (date.today() + timedelta(days=31)).isoformat(),
        'id_turno': 1, 'ci': mysql_users['Administrador'][0], 'estado': 'Activa',
    })
    assert response.status_code == 201, response.get_json()
    booking_id = response.get_json()['id_reserva']
    assert client.patch(f'/reservas/cancelar/{booking_id}', headers=student_headers).status_code == 403


@pytest.mark.xfail(strict=True, raises=AssertionError, reason='Concurrent overlap checks can both insert; pending transactional locking/constraint')
def test_two_concurrent_claims_cannot_both_book_the_same_room(mysql_users):
    barrier = Barrier(2, timeout=10)
    booking_date = (date.today() + timedelta(days=60)).isoformat()

    def claim(ci):
        connection = get_connection('Administrador')
        cursor = connection.cursor()
        try:
            ensure_no_solapamiento_de_reserva(connection, 'Sala Sal1', 'Campus Salto', booking_date, 1)
            barrier.wait()
            cursor.execute('INSERT INTO reserva (nombre_sala,edificio,fecha,id_turno,ci_organizador) VALUES (%s,%s,%s,%s,%s)', ('Sala Sal1', 'Campus Salto', booking_date, 1, ci))
            connection.commit()
            return True
        except ValueError:
            connection.rollback()
            return False
        finally:
            cursor.close()
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(claim, [mysql_users['Administrador'][0], mysql_users['Participante'][0]]))
    assert sum(results) == 1, 'Both concurrent requests reserved the same room and time'
