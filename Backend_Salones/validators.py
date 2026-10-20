from datetime import datetime, timedelta, time, date
from db import get_connection

def _to_time(value):

    if isinstance(value, time):
        return value

    if isinstance(value, timedelta):
        return (datetime.min + value).time()

    if isinstance(value, str):
        txt = value.strip()
        fmt = "%H:%M:%S" if txt.count(":") == 2 else "%H:%M"
        return datetime.strptime(txt, fmt).time()

    raise ValueError(f"Hora inválida: {value!r}")

def validar_ci(ci):
    ci = str(ci)
    if not ci or not ci.isdigit() or len(ci) != 8:
        return False
    factores = [2, 9, 8, 7, 6, 3, 4]
    suma = sum(int(ci[i]) * factores[i] for i in range(7))
    verificador = (10 - suma % 10) % 10
    return verificador == int(ci[7])

def validar_email_ucu(email):
    email = str(email or "")
    e = email.lower()
    return e.endswith("@correo.ucu.edu.uy") or e.endswith("@ucu.edu.uy")

def validate_turno_rango(hora_inicio, hora_fin):
    fmt = "%H:%M:%S" if len(hora_inicio) == 8 else "%H:%M"
    hi = datetime.strptime(hora_inicio, fmt).time()
    hf = datetime.strptime(hora_fin, fmt).time()
    if not (time(8, 0) <= hi < hf <= time(23, 0)):
        raise ValueError("El turno debe estar entre 08:00 y 23:00, y fin > inicio.")

def validate_reserva_fecha(fecha_iso):
    f = datetime.strptime(fecha_iso, "%Y-%m-%d").date()
    if f < date.today():
        raise ValueError("La reserva no puede ser en una fecha pasada.")

def validate_reserva_participante_fecha(fecha_iso):
    f = datetime.strptime(fecha_iso, "%Y-%m-%d").date()
    if f > date.today():
        raise ValueError("La fecha de solicitud no puede ser futura.")

def validate_sancion_dates(fecha_inicio, fecha_fin):
    fi = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
    ff = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    if ff <= fi:
        raise ValueError("La fecha de fin debe ser posterior a la de inicio.")


def validar_disponibilidad_sala(nombre_sala, edificio):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT disponible 
        FROM salasDeEstudio 
        WHERE nombre_sala = %s AND edificio = %s
    """, (nombre_sala, edificio))
    sala = cur.fetchone()
    cur.close(); conn.close()

    if not sala:
        return False, "La sala especificada no existe."
    if not sala["disponible"]:
        return False, "La sala seleccionada no está disponible actualmente."
    return True, "Sala disponible para reservar."

def validar_anticipacion_reserva(id_turno, fecha_str):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT hora_inicio FROM turno WHERE id_turno = %s", (id_turno,))
    turno = cur.fetchone()
    cur.close(); conn.close()

    if not turno:
        return False, "El turno especificado no existe."
    hora_turno_raw = turno["hora_inicio"]
    hora_turno = _to_time(hora_turno_raw)

    fecha_turno = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    fecha_hora_turno = datetime.combine(fecha_turno, hora_turno)

    if fecha_hora_turno - datetime.now() < timedelta(hours=1):
        return False, "No se puede reservar con menos de una hora de anticipación."

    return True, "Reserva con anticipación válida."

def validar_cancelacion_reserva(id_reserva):

    con = get_connection()
    cur = con.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT r.fecha, t.hora_inicio
              FROM reserva r
              JOIN turno t ON t.id_turno = r.id_turno
             WHERE r.id_reserva = %s
        """, (id_reserva,))
        reserva = cur.fetchone()
        if not reserva:
            return False, "La reserva no existe"

        fecha = reserva["fecha"]
        hora_inicio = reserva["hora_inicio"]

        if isinstance(hora_inicio, timedelta):
            hora_inicio = (datetime.min + hora_inicio).time()
        elif isinstance(hora_inicio, str):
            try:
                hora_inicio = datetime.strptime(hora_inicio, "%H:%M:%S").time()
            except ValueError:
                hora_inicio = datetime.strptime(hora_inicio[:5], "%H:%M").time()
        elif not isinstance(hora_inicio, time):
            return False, "Formato de hora de la reserva inválido"

        fecha_hora_reserva = datetime.combine(fecha, hora_inicio)
        ahora = datetime.now()

        if fecha_hora_reserva <= ahora:
            return False, "Solo se pueden cancelar reservas futuras"

        return True, ""

    except Exception as e:
        print("ERROR en validar_cancelacion_reserva:", e)
        return False, "Error interno al validar la cancelación"
    finally:
        cur.close()
        con.close()

def ensure_no_solapamiento_de_reserva(conn, nombre_sala, edificio, fecha, id_turno):
    cur = conn.cursor()
    cur.execute("""
                SELECT 1
                FROM reserva
                WHERE edificio = %s
                  AND fecha = %s
                  AND id_turno = %s
                  AND estado = 'Activa' LIMIT 1
                """, (edificio, fecha, id_turno))
    exists = cur.fetchone()
    cur.close()
    if exists:
        raise ValueError("Ya existe una reserva para esa sala, fecha y turno.")

def ensure_capacidad_no_superada(conn, id_reserva):
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT s.capacidad,
               (SELECT COUNT(*) 
                FROM reservaParticipante rp 
                WHERE rp.id_reserva = r.id_reserva) AS cant
        FROM reserva r
        JOIN salasDeEstudio s 
          ON s.nombre_sala = r.nombre_sala AND s.edificio = r.edificio
        WHERE r.id_reserva = %s
    """, (id_reserva,))
    row = cur.fetchone()
    cur.close()
    if row and row["cant"] is not None and row["capacidad"] is not None:
        if row["cant"] > row["capacidad"]:
            raise ValueError("Capacidad de la sala superada.")

def validar_sanciones_activas(ci_participante):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT COUNT(*) AS activas
        FROM sancion_participante
        WHERE ci_participante = %s
          AND CURDATE() BETWEEN fecha_inicio AND fecha_fin
    """, (ci_participante,))
    res = cur.fetchone()
    cur.close(); conn.close()
    if res["activas"] > 0:
        return False, "El usuario tiene sanciones activas y no puede realizar reservas."
    return True, "El usuario no tiene sanciones activas."

def validar_tipo_sala(edificio, nombre_sala, ci_principal, participantes_ci):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT tipo_sala 
        FROM salasDeEstudio 
        WHERE nombre_sala=%s AND edificio=%s
    """, (nombre_sala, edificio))
    sala = cur.fetchone()
    if not sala:
        cur.close(); conn.close()
        return False, "La sala especificada no existe."
    tipo_sala = sala["tipo_sala"]
    if tipo_sala == "Libre":
        cur.close(); conn.close()
        return True, "Sala libre, reserva permitida."

    cur.execute("""
        SELECT pa.tipo, ppa.rol
        FROM participanteProgramaAcademico ppa
        JOIN planAcademico pa ON pa.nombre_plan = ppa.nombre_plan
        WHERE ppa.ci_participante = %s
    """, (ci_principal,))
    principal = cur.fetchone()
    if not principal:
        cur.close(); conn.close()
        return False, "El usuario principal no está asociado a ningún plan académico."

    tipo_principal = principal["tipo"]
    rol_principal  = principal["rol"]

    if tipo_sala == "Posgrado" and not (tipo_principal == "Posgrado" or rol_principal == "Docente"):
        cur.close(); conn.close()
        return False, "Solo docentes o alumnos de posgrado pueden reservar esta sala."
    if tipo_sala == "Docente" and rol_principal != "Docente":
        cur.close(); conn.close()
        return False, "Solo docentes pueden reservar esta sala."

    for ci in participantes_ci:
        cur.execute("""
            SELECT pa.tipo, ppa.rol
            FROM participanteProgramaAcademico ppa
            JOIN planAcademico pa ON pa.nombre_plan = ppa.nombre_plan
            WHERE ppa.ci_participante = %s
        """, (ci,))
        participante = cur.fetchone()
        if not participante:
            continue
        tipo_p = participante["tipo"]
        rol_p  = participante["rol"]
        if tipo_sala == "Posgrado" and not (tipo_p == "Posgrado" or rol_p == "Docente"):
            cur.close(); conn.close()
            return False, f"El participante {ci} no puede usar una sala exclusiva de posgrado."
        if tipo_sala == "Docente" and rol_p != "Docente":
            cur.close(); conn.close()
            return False, f"El participante {ci} no puede usar una sala exclusiva de docentes."

    cur.close(); conn.close()
    return True, "Tipo de sala válido."

def ensure_reglas_usuario(conn, ci, id_reserva):
    c = conn.cursor(dictionary=True)
    c.execute("""
        SELECT r.fecha, r.nombre_sala, r.edificio, s.tipo_sala
        FROM reserva r
        JOIN salasDeEstudio s ON s.nombre_sala = r.nombre_sala AND s.edificio = r.edificio
        WHERE r.id_reserva = %s
    """, (id_reserva,))
    r = c.fetchone()
    if not r:
        c.close()
        raise ValueError("La reserva no existe.")
    fecha = r["fecha"].strftime("%Y-%m-%d")
    tipo_sala = r["tipo_sala"]

    c.execute("""
        SELECT ppa.rol, pa.tipo
        FROM participanteProgramaAcademico ppa
        JOIN planAcademico pa ON pa.nombre_plan = ppa.nombre_plan
        WHERE ppa.ci_participante = %s
        LIMIT 1
    """, (ci,))
    rol_row = c.fetchone()
    c.close()

    rol  = (rol_row or {}).get("rol", "Alumno")
    tipo = (rol_row or {}).get("tipo", "Grado")

    es_docente  = (rol == "Docente")
    es_posgrado = (tipo == "Posgrado")

    if (es_docente and tipo_sala == "Docente") or (es_posgrado and tipo_sala == "Posgrado"):
        return

    cur = conn.cursor()
    cur.execute("""
        SELECT COUNT(*) AS horas
        FROM reserva r
        JOIN reservaParticipante rp ON rp.id_reserva = r.id_reserva
        WHERE rp.ci_participante = %s
          AND r.fecha = %s
          AND r.estado IN ('Activa','Finalizada','Sin asistencia')
    """, (ci, fecha))
    horas = cur.fetchone()[0]
    cur.close()
    if horas >= 2:
        raise ValueError("Límite de 2 horas por día alcanzado para salas libres.")

    f = datetime.strptime(fecha, "%Y-%m-%d").date()
    semana_ini = (f - timedelta(days=f.weekday())).strftime("%Y-%m-%d")
    semana_fin = (f + timedelta(days=(6 - f.weekday()))).strftime("%Y-%m-%d")
    cur = conn.cursor()
    cur.execute("""
        SELECT COUNT(*)
        FROM reserva r
        JOIN reservaParticipante rp ON rp.id_reserva = r.id_reserva
        WHERE rp.ci_participante = %s
          AND r.fecha BETWEEN %s AND %s
          AND r.estado IN ('Activa','Finalizada','Sin asistencia')
    """, (ci, semana_ini, semana_fin))
    cant_semana = cur.fetchone()[0]
    cur.close()
    if cant_semana >= 3:
        raise ValueError("Límite de 3 reservas activas en la semana alcanzado (salas libres).")

def validar_resena_unica(id_reserva, ci_participante):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT resenado 
        FROM reservaParticipante 
        WHERE id_reserva = %s AND ci_participante = %s
        """,
        (id_reserva, ci_participante),
    )
    registro = cursor.fetchone()

    cursor.close()
    conn.close()

    if not registro:
        return False, "No existe registro de participación en la reserva."
    if registro["resenado"]:
        return False, "Ya se ha realizado una reseña para esta reserva."

    return True, "Reseña permitida."

def es_organizador(conn, id_reserva, ci):
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM reserva WHERE id_reserva = %s AND ci_organizador = %s LIMIT 1", (id_reserva, ci))
    ok = cur.fetchone() is not None
    cur.close()
    return ok