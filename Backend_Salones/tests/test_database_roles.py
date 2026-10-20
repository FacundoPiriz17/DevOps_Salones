import pytest
from flask import request

import db
from app import app


@pytest.mark.parametrize('role,prefix', [
    ('Administrador', 'DB_ADMIN'), ('Funcionario', 'DB_FUNC'),
    ('Participante', 'DB_PART'), (None, 'DB_LOGIN'),
])
def test_connection_uses_role_specific_credentials(monkeypatch, role, prefix):
    calls = []
    monkeypatch.setattr(db.mysql.connector, 'connect', lambda **kwargs: calls.append(kwargs))
    db.get_connection(role)
    expected_user = db.DB_LOGIN if prefix == 'DB_LOGIN' else getattr(db, f'{prefix}_USER')
    assert calls[0]['user'] == expected_user
    assert calls[0]['password'] == getattr(db, f'{prefix}_PASSWORD')
    assert calls[0]['database'] == db.DB_NAME


def test_connection_reads_authenticated_role_from_request(monkeypatch):
    calls = []
    monkeypatch.setattr(db.mysql.connector, 'connect', lambda **kwargs: calls.append(kwargs))
    with app.test_request_context('/'):
        request.usuario_actual = {'rol': 'Administrador'}
        db.get_connection()
    assert calls[0]['user'] == db.DB_ADMIN_USER
