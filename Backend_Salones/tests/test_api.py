from datetime import timedelta

import pytest

import routes.reservas as booking_routes
import routes.salas as room_routes
import routes.turnos as slot_routes


@pytest.mark.parametrize('role', ['Participante', 'Funcionario'])
def test_room_creation_rejects_non_admin(client, auth_headers, role):
    assert client.post('/salas/registrar', json={}, headers=auth_headers(role)).status_code == 403


@pytest.mark.parametrize('patch', [
    {'capacidad': -1}, {'capacidad': 'many'}, {'puntaje': 6},
    {'tipo_sala': 'Unknown'}, {'nombre_sala': ''},
])
def test_room_creation_validates_input_before_database(client, auth_headers, patch):
    body = {'nombre_sala': 'QA 1', 'edificio': 'Edificio A', 'capacidad': 4, 'tipo_sala': 'Libre'}
    body.update(patch)
    assert client.post('/salas/registrar', json=body, headers=auth_headers('Administrador')).status_code == 400


@pytest.mark.parametrize('exists,status', [(0, 201), (1, 400)])
def test_room_creation_and_duplicate_rejection(client, auth_headers, database, monkeypatch, exists, status):
    connection, cursor = database
    cursor.fetchone.return_value = {'existe': exists}
    monkeypatch.setattr(room_routes, 'get_connection', lambda: connection)
    response = client.post('/salas/registrar', headers=auth_headers('Administrador'), json={
        'nombre_sala': 'QA 1', 'edificio': 'Edificio A', 'capacidad': 4, 'tipo_sala': 'Libre',
    })
    assert response.status_code == status
    assert connection.commit.call_count == (1 if status == 201 else 0)
    connection.close.assert_called_once()


def test_room_creation_rolls_back_failed_insert(client, auth_headers, database, monkeypatch):
    connection, cursor = database
    cursor.fetchone.return_value = {'existe': 0}
    cursor.execute.side_effect = [None, RuntimeError('simulated write failure')]
    monkeypatch.setattr(room_routes, 'get_connection', lambda: connection)
    response = client.post('/salas/registrar', headers=auth_headers('Administrador'), json={
        'nombre_sala': 'QA 1', 'edificio': 'Edificio A', 'capacidad': 4, 'tipo_sala': 'Libre',
    })
    assert response.status_code == 500
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()


def test_slot_list_serializes_mysql_time(client, auth_headers, database, monkeypatch):
    connection, cursor = database
    cursor.fetchall.return_value = [{'id_turno': 1, 'hora_inicio': timedelta(hours=8), 'hora_fin': timedelta(hours=9)}]
    monkeypatch.setattr(slot_routes, 'get_connection', lambda: connection)
    response = client.get('/turnos/all', headers=auth_headers())
    assert response.status_code == 200
    assert response.get_json() == [{'id_turno': 1, 'hora_inicio': '08:00:00', 'hora_fin': '09:00:00'}]


def test_slot_creation_commits_valid_slot(client, auth_headers, database, monkeypatch):
    connection, cursor = database
    monkeypatch.setattr(slot_routes, 'get_connection', lambda: connection)
    response = client.post('/turnos', headers=auth_headers('Administrador'), json={'hora_inicio': '08:00', 'hora_fin': '09:00'})
    assert response.status_code == 201
    assert response.get_json()['id_turno'] == cursor.lastrowid
    connection.commit.assert_called_once()


def test_slot_creation_rejects_invalid_range(client, auth_headers):
    response = client.post('/turnos', headers=auth_headers('Administrador'), json={'hora_inicio': '10:00', 'hora_fin': '09:00'})
    assert response.status_code == 400


def test_participant_cannot_cancel_someone_elses_booking(client, auth_headers, database, monkeypatch):
    connection, _ = database
    monkeypatch.setattr(booking_routes, 'get_connection', lambda: connection)
    monkeypatch.setattr(booking_routes, 'es_organizador', lambda *args: False)
    response = client.patch('/reservas/cancelar/42', headers=auth_headers())
    assert response.status_code == 403
    connection.commit.assert_not_called()
    connection.close.assert_called_once()


@pytest.mark.parametrize('role', ['Participante', 'Funcionario', 'Administrador'])
def test_authorized_user_cancels_future_booking(client, auth_headers, database, monkeypatch, role):
    connection, _ = database
    monkeypatch.setattr(booking_routes, 'get_connection', lambda: connection)
    monkeypatch.setattr(booking_routes, 'es_organizador', lambda *args: True)
    monkeypatch.setattr(booking_routes, 'validar_cancelacion_reserva', lambda *args: (True, ''))
    response = client.patch('/reservas/cancelar/42', headers=auth_headers(role))
    assert response.status_code == 200
    connection.commit.assert_called_once()


def test_cancellation_rolls_back_missing_booking(client, auth_headers, database, monkeypatch):
    connection, cursor = database
    cursor.rowcount = 0
    monkeypatch.setattr(booking_routes, 'get_connection', lambda: connection)
    monkeypatch.setattr(booking_routes, 'validar_cancelacion_reserva', lambda *args: (True, ''))
    assert client.patch('/reservas/cancelar/42', headers=auth_headers('Administrador')).status_code == 404
    connection.rollback.assert_called_once()
    connection.commit.assert_not_called()


def test_past_booking_cannot_be_cancelled(client, auth_headers, database, monkeypatch):
    connection, _ = database
    monkeypatch.setattr(booking_routes, 'get_connection', lambda: connection)
    monkeypatch.setattr(booking_routes, 'validar_cancelacion_reserva', lambda *args: (False, 'Solo se pueden cancelar reservas futuras'))
    assert client.patch('/reservas/cancelar/42', headers=auth_headers('Administrador')).status_code == 400
    connection.commit.assert_not_called()
