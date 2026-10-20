from datetime import date, datetime, time, timedelta
from unittest.mock import MagicMock

import pytest

import validators


@pytest.mark.parametrize('value', ['90000303', 55574121, '56901393'])
def test_valid_ci(value):
    assert validators.validar_ci(value)


@pytest.mark.parametrize('value', [None, '', '123', '90000304', '9000030X', '900003030'])
def test_invalid_ci(value):
    assert not validators.validar_ci(value)


@pytest.mark.parametrize('value', ['alumno@correo.ucu.edu.uy', 'docente@ucu.edu.uy', 'DOCENTE@UCU.EDU.UY'])
def test_institutional_email(value):
    assert validators.validar_email_ucu(value)


@pytest.mark.parametrize('value', [None, '', 'alumno@example.com', 'ucu.edu.uy', 'a@ucu.edu.uy.example.com'])
def test_non_institutional_email(value):
    assert not validators.validar_email_ucu(value)


@pytest.mark.parametrize('start,end', [('08:00', '09:00'), ('22:00', '23:00'), ('08:00:00', '23:00:00')])
def test_valid_time_slot(start, end):
    validators.validate_turno_rango(start, end)


@pytest.mark.parametrize('start,end', [('07:59', '09:00'), ('22:00', '23:01'), ('10:00', '10:00'), ('11:00', '10:00'), ('invalid', '10:00')])
def test_invalid_time_slot(start, end):
    with pytest.raises(ValueError):
        validators.validate_turno_rango(start, end)


def test_booking_date_accepts_today_and_future_but_rejects_past():
    today = date.today()
    validators.validate_reserva_fecha(today.isoformat())
    validators.validate_reserva_fecha((today + timedelta(days=1)).isoformat())
    with pytest.raises(ValueError, match='pasada'):
        validators.validate_reserva_fecha((today - timedelta(days=1)).isoformat())


def test_participation_date_cannot_be_in_the_future():
    today = date.today()
    validators.validate_reserva_participante_fecha(today.isoformat())
    with pytest.raises(ValueError, match='futura'):
        validators.validate_reserva_participante_fecha((today + timedelta(days=1)).isoformat())


@pytest.mark.parametrize('end', ['2026-10-01', '2026-09-30'])
def test_sanction_must_end_after_start(end):
    with pytest.raises(ValueError):
        validators.validate_sancion_dates('2026-10-01', end)


def test_sanction_date_range():
    validators.validate_sancion_dates('2026-10-01', '2026-10-02')


@pytest.mark.parametrize('value', [time(9, 30), timedelta(hours=9, minutes=30), '09:30', '09:30:00'])
def test_mysql_time_representations(value):
    assert validators._to_time(value) == time(9, 30)


@pytest.mark.parametrize('row,expected', [(None, False), ({'disponible': False}, False), ({'disponible': True}, True)])
def test_room_availability(monkeypatch, database, row, expected):
    connection, cursor = database
    cursor.fetchone.return_value = row
    monkeypatch.setattr(validators, 'get_connection', lambda: connection)
    ok, message = validators.validar_disponibilidad_sala('Sala 1', 'Edificio A')
    assert ok is expected
    assert message
    cursor.close.assert_called_once()
    connection.close.assert_called_once()


@pytest.mark.parametrize('count,allowed', [(0, True), (1, False), (3, False)])
def test_active_sanctions_block_booking(monkeypatch, database, count, allowed):
    connection, cursor = database
    cursor.fetchone.return_value = {'activas': count}
    monkeypatch.setattr(validators, 'get_connection', lambda: connection)
    assert validators.validar_sanciones_activas(90000303)[0] is allowed


@pytest.mark.parametrize('count,capacity,allowed', [(0, 2, True), (2, 2, True), (3, 2, False)])
def test_capacity_boundary(database, count, capacity, allowed):
    connection, cursor = database
    cursor.fetchone.return_value = {'cant': count, 'capacidad': capacity}
    if allowed:
        validators.ensure_capacidad_no_superada(connection, 42)
    else:
        with pytest.raises(ValueError, match='Capacidad'):
            validators.ensure_capacidad_no_superada(connection, 42)


@pytest.mark.parametrize('daily,weekly,allowed', [(1, 2, True), (2, 2, False), (0, 3, False)])
def test_per_user_daily_and_weekly_limits(daily, weekly, allowed):
    connection = MagicMock()
    cursor = connection.cursor.return_value
    cursor.fetchone.side_effect = [
        {'fecha': date(2026, 10, 20), 'tipo_sala': 'Libre'},
        {'rol': 'Alumno', 'tipo': 'Grado'},
        (daily,),
        (weekly,),
    ]
    if allowed:
        validators.ensure_reglas_usuario(connection, 90000303, 42)
    else:
        with pytest.raises(ValueError, match='Límite'):
            validators.ensure_reglas_usuario(connection, 90000303, 42)


@pytest.mark.parametrize('role,program,room', [('Docente', 'Grado', 'Docente'), ('Alumno', 'Posgrado', 'Posgrado')])
def test_exclusive_room_limit_exemptions(database, role, program, room):
    connection, cursor = database
    cursor.fetchone.side_effect = [{'fecha': date.today(), 'tipo_sala': room}, {'rol': role, 'tipo': program}]
    validators.ensure_reglas_usuario(connection, 90000303, 42)
    assert cursor.execute.call_count == 2


@pytest.mark.parametrize('days,allowed', [(1, True), (-1, False)])
def test_cancel_only_future_bookings(monkeypatch, database, days, allowed):
    connection, cursor = database
    cursor.fetchone.return_value = {'fecha': date.today() + timedelta(days=days), 'hora_inicio': timedelta(hours=10)}
    monkeypatch.setattr(validators, 'get_connection', lambda: connection)
    assert validators.validar_cancelacion_reserva(42)[0] is allowed
    connection.close.assert_called_once()


def test_one_hour_advance_boundary(monkeypatch, database):
    connection, cursor = database
    cursor.fetchone.return_value = {'hora_inicio': time(10)}
    monkeypatch.setattr(validators, 'get_connection', lambda: connection)

    class Clock(datetime):
        @classmethod
        def now(cls):
            return cls(2026, 10, 20, 9, 0)

    monkeypatch.setattr(validators, 'datetime', Clock)
    assert validators.validar_anticipacion_reserva(1, '2026-10-20')[0]
    cursor.fetchone.return_value = {'hora_inicio': time(9, 59)}
    assert not validators.validar_anticipacion_reserva(1, '2026-10-20')[0]
