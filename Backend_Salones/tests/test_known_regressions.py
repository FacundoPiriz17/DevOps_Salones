"""Known defects: strict XFAIL records them without asserting incorrect behavior as correct."""
from datetime import date, timedelta

import pytest

import routes.reservas as booking_routes
import validators


@pytest.mark.xfail(strict=True, raises=AssertionError, reason='Overlap query ignores nombre_sala; pending business-logic fix')
def test_overlap_lookup_is_scoped_to_the_requested_room(database):
    connection, cursor = database
    cursor.fetchone.return_value = None
    validators.ensure_no_solapamiento_de_reserva(connection, 'Sala A', 'Edificio A', '2026-12-01', 1)
    sql, arguments = cursor.execute.call_args.args
    assert 'nombre_sala = %s' in ' '.join(sql.split())
    assert 'Sala A' in arguments


@pytest.mark.xfail(strict=True, raises=AssertionError, reason='Reservation commits before user-limit validation; pending atomicity fix')
def test_rejected_user_limit_never_commits_reservation(client, auth_headers, database, monkeypatch):
    connection, cursor = database
    cursor.fetchone.return_value = (1,)
    monkeypatch.setattr(booking_routes, 'get_connection', lambda: connection)
    for name in ['validar_disponibilidad_sala', 'validar_sanciones_activas', 'validar_tipo_sala', 'validar_anticipacion_reserva']:
        monkeypatch.setattr(booking_routes, name, lambda *args: (True, ''))
    monkeypatch.setattr(booking_routes, 'ensure_no_solapamiento_de_reserva', lambda *args: None)

    def reject_limit(*args):
        raise ValueError('Límite alcanzado')

    monkeypatch.setattr(booking_routes, 'ensure_reglas_usuario', reject_limit)
    response = client.post('/reservas/registrar', headers=auth_headers(), json={
        'nombre_sala': 'Sala A', 'edificio': 'Edificio A',
        'fecha': (date.today() + timedelta(days=1)).isoformat(),
        'id_turno': 1, 'ci': 90000303, 'estado': 'Activa',
    })
    assert response.status_code == 400
    connection.commit.assert_not_called()
