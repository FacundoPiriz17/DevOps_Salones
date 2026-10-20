import os
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import jwt
import mysql.connector
import pytest

# Never use a developer's JWT signing key or load their .env during tests.
os.environ['SECRET_KEY'] = 'salones-ci-test-key-not-for-deployment'
os.environ['PYTHON_DOTENV_DISABLED'] = '1'

from app import app
from config import SECRET_KEY


@pytest.fixture(autouse=True)
def isolate_database(request, monkeypatch):
    if request.node.get_closest_marker('mysql'):
        return

    def unexpected_connection(*args, **kwargs):
        pytest.fail('Unit test attempted a real MySQL connection; patch the route connection.')

    monkeypatch.setattr(mysql.connector, 'connect', unexpected_connection)


@pytest.fixture
def client():
    previous_testing = app.config['TESTING']
    app.config['TESTING'] = True
    with app.test_client() as test_client:
        yield test_client
    app.config['TESTING'] = previous_testing


@pytest.fixture
def auth_headers():
    def make(rol='Participante', ci=90000303, **claims):
        payload = {
            'ci': ci,
            'email': 'qa.student@ucu.edu.uy',
            'rol': rol,
            'exp': datetime.now(timezone.utc) + timedelta(minutes=30),
        }
        payload.update(claims)
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        return {'Authorization': f'Bearer {token}'}

    return make


@pytest.fixture
def database():
    connection = MagicMock(name='connection')
    cursor = connection.cursor.return_value
    cursor.rowcount = 1
    cursor.lastrowid = 42
    return connection, cursor
