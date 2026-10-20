from flask_cors import CORS
from flask import Flask
from routes.login import login_bp
from routes.edificios import edificio_bp
from routes.sanciones import sanciones_bp
from routes.resenias import resenias_bp
from routes.stats import stats_bp
from routes.turnos import turno_bp
from routes.reservas import reservas_bp
from routes.salas import salas_bp
from routes.programas import programas_bp

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    }},
)
app.register_blueprint(login_bp)
app.register_blueprint(edificio_bp)

app.register_blueprint(sanciones_bp)

app.register_blueprint(resenias_bp)

app.register_blueprint(stats_bp)

app.register_blueprint(turno_bp)

app.register_blueprint(reservas_bp)

app.register_blueprint(salas_bp)

app.register_blueprint(programas_bp)

@app.before_request
def handle_preflight():
    from flask import request
    if request.method == "OPTIONS":
        return ("", 200)
@app.route('/')
def init():
    return 'API de Gestión de Salas UCU · Proyecto DevOps'

if __name__ == '__main__':
    app.run(debug=True)
