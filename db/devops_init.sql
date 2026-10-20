CREATE DATABASE IF NOT EXISTS DevOpsSalones;
USE DevOpsSalones;
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

CREATE TABLE usuario (
                         ci INT,
                         nombre VARCHAR(32) NOT NULL CHECK (CHAR_LENGTH(nombre) >= 3),
                         apellido VARCHAR(32) NOT NULL CHECK (CHAR_LENGTH(apellido) >= 3),
                         email VARCHAR(50) UNIQUE CHECK (
                             LOWER(email) LIKE '%@correo.ucu.edu.uy'
                                 OR LOWER(email) LIKE '%@ucu.edu.uy'
                             ),
                         rol ENUM('Participante', 'Funcionario', 'Administrador') NOT NULL DEFAULT 'Participante',
                         activo BOOLEAN NOT NULL DEFAULT TRUE,
                         PRIMARY KEY (ci)
);

CREATE TABLE login(
                      email VARCHAR(50) PRIMARY KEY,
                      contrasena VARCHAR(255) NOT NULL,
                      CONSTRAINT login_1
                          FOREIGN KEY (email) REFERENCES usuario(email)
                              ON UPDATE CASCADE
);

CREATE TABLE facultad (
                          id_Facultad INT AUTO_INCREMENT PRIMARY KEY,
                          nombre_facultad VARCHAR(64) CHECK (CHAR_LENGTH(nombre_facultad) >= 3)
);

CREATE TABLE planAcademico (
                               nombre_plan VARCHAR(80) PRIMARY KEY,
                               id_Facultad INT NOT NULL,
                               tipo ENUM('Grado', 'Posgrado') NOT NULL,
                               FOREIGN KEY (id_Facultad) REFERENCES facultad(id_Facultad)
);

CREATE TABLE participanteProgramaAcademico (
                                               idAlumnoPrograma INT PRIMARY KEY AUTO_INCREMENT,
                                               ci_participante INT,
                                               nombre_plan VARCHAR(80) NOT NULL,
                                               rol ENUM('Alumno', 'Docente') NOT NULL,
                                               FOREIGN KEY (ci_participante) REFERENCES usuario(ci),
                                               FOREIGN KEY (nombre_plan) REFERENCES planAcademico(nombre_plan)
);

CREATE TABLE edificio (
                          nombre_edificio VARCHAR(64) PRIMARY KEY,
                          direccion VARCHAR(64) NOT NULL,
                          campus VARCHAR(64) NOT NULL CHECK (CHAR_LENGTH(campus) >= 5)
);

CREATE TABLE salasDeEstudio (
                                nombre_sala VARCHAR(32),
                                edificio VARCHAR(64),
                                capacidad INT NOT NULL CHECK (capacidad > 0),
                                tipo_sala ENUM('Libre', 'Posgrado', 'Docente') NOT NULL,
                                disponible BOOLEAN DEFAULT TRUE,
                                puntaje INT CHECK (puntaje BETWEEN 1 AND 5) DEFAULT 3,
                                PRIMARY KEY (nombre_sala, edificio),
                                FOREIGN KEY (edificio) REFERENCES edificio(nombre_edificio)
);

CREATE TABLE turno (
                       id_turno INT AUTO_INCREMENT PRIMARY KEY,
                       hora_inicio TIME NOT NULL,
                       hora_fin TIME NOT NULL,
                       CONSTRAINT horario_valido CHECK (hora_inicio < hora_fin)
);

CREATE TABLE reserva (
                         id_reserva INT AUTO_INCREMENT PRIMARY KEY,
                         nombre_sala VARCHAR(32) NOT NULL,
                         edificio VARCHAR(64) NOT NULL,
                         fecha DATE NOT NULL,
                         id_turno INT NOT NULL,
                         ci_organizador INT NOT NULL,
                         estado ENUM('Activa', 'Cancelada', 'Sin asistencia', 'Finalizada') DEFAULT 'Activa',
                         FOREIGN KEY (nombre_sala, edificio) REFERENCES salasDeEstudio(nombre_sala, edificio),
                         FOREIGN KEY (edificio) REFERENCES edificio(nombre_edificio),
                         FOREIGN KEY (id_turno) REFERENCES turno(id_turno),
                         FOREIGN KEY (ci_organizador) REFERENCES usuario(ci)
);

CREATE TABLE reservaParticipante (
                                     ci_participante INT NOT NULL,
                                     id_reserva INT NOT NULL,
                                     fecha_solicitud_reserva DATE DEFAULT (CURDATE()),
                                     asistencia ENUM('Asiste', 'No asiste') NOT NULL,
                                     confirmacion ENUM('Pendiente', 'Confirmado', 'Rechazado') NOT NULL DEFAULT 'Pendiente',
                                     resenado BOOLEAN DEFAULT FALSE,
                                     PRIMARY KEY (ci_participante, id_reserva),
                                     FOREIGN KEY (ci_participante) REFERENCES usuario(ci),
                                     FOREIGN KEY (id_reserva) REFERENCES reserva(id_reserva)
                                         ON UPDATE CASCADE
);

CREATE TABLE sancion_participante (
                                      id_sancion INT AUTO_INCREMENT PRIMARY KEY,
                                      ci_participante INT NOT NULL,
                                      motivo ENUM('Uso indebido', 'Morosidad', 'Vandalismo', 'Inasistencia') NOT NULL,
                                      fecha_inicio DATE NOT NULL,
                                      fecha_fin DATE NOT NULL,
                                      FOREIGN KEY (ci_participante) REFERENCES usuario(ci)
);

CREATE TABLE resena (
                        id_resena INT AUTO_INCREMENT PRIMARY KEY,
                        id_reserva INT NOT NULL,
                        ci_participante INT NULL,
                        fecha_publicacion DATETIME NOT NULL DEFAULT NOW(),
                        puntaje_general INT NOT NULL CHECK (puntaje_general BETWEEN 1 AND 5),
                        descripcion VARCHAR(255) DEFAULT NULL,
                        FOREIGN KEY (ci_participante) REFERENCES usuario(ci),
                        CONSTRAINT fk_resena_reserva
                            FOREIGN KEY (id_reserva) REFERENCES reserva(id_reserva)
                                ON UPDATE CASCADE
);

INSERT INTO usuario (ci, nombre, apellido, email, rol)
VALUES
    (55574121, 'Facundo', 'Piriz','facundo.piriz@correo.ucu.edu.uy','Administrador'),
    (56901393, 'Diego', 'De Olivera','diego.deoliveira@correo.ucu.edu.uy','Funcionario'),
    (55992757, 'Agustín', 'García','agustin.garciab@correo.ucu.edu.uy','Participante'),
    (10000008, 'Thiago','García','thiago.garcia@correo.ucu.edu.uy','Participante'),
    (10000014, 'Santiago','Aguerre','santiago.aguerre@correo.ucu.edu.uy','Participante'),
    (10000020, 'Agostina','Etchebarren','agostina.etchebarren@correo.ucu.edu.uy','Participante'),
    (10000036, 'Constanza','Blanco','constanza.blanco@correo.ucu.edu.uy','Funcionario'),
    (10000042, 'Manuel','Cabrera','manuel.cabrera@correo.ucu.edu.uy','Funcionario'),
    (10000058, 'Martin','Mujica','martin.mujica@correo.ucu.edu.uy','Administrador'),
    (10000064, 'Santiago','Blanco','santiago.blanco@correo.ucu.edu.uy','Administrador'),
    (10000070, 'Felipe','Paladino','felipe.paladino@correo.ucu.edu.uy','Participante'),
    (10010089, 'Lucio', 'Fernandez','lucio.fernandez@correo.ucu.edu.uy','Participante'),
    (10020082, 'María', 'Lopez','maria.lopez@correo.ucu.edu.uy','Participante'),
    (10040094, 'Valentina', 'Martinez','valentina.martinez@correo.ucu.edu.uy','Participante'),
    (10030091, 'Rodrigo', 'Gonzalez','rodrigo.gonzalez@correo.ucu.edu.uy','Participante'),
    (10050100, 'Camila', 'Santos','camila.santos@correo.ucu.edu.uy','Participante');

INSERT INTO login (email, contrasena) VALUES
                                          ('facundo.piriz@correo.ucu.edu.uy', '$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('diego.deoliveira@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('thiago.garcia@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('santiago.aguerre@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('agostina.etchebarren@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('constanza.blanco@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('manuel.cabrera@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('martin.mujica@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('santiago.blanco@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('felipe.paladino@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('agustin.garciab@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('lucio.fernandez@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('maria.lopez@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('valentina.martinez@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('rodrigo.gonzalez@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2'),
                                          ('camila.santos@correo.ucu.edu.uy','$2b$12$c2kgM37h6ri1RGeroGPsMOZoZJwXLMyKYhLkhtmMWJRkKQXdh1ey2');

INSERT INTO facultad (nombre_facultad) VALUES
                                           ('Ingeniería y Tecnologías'),
                                           ('Derecho y Ciencias Humanas'),
                                           ('Ciencias Empresariales'),
                                           ('Ciencias de la Salud');

INSERT INTO planAcademico (nombre_plan, id_Facultad, tipo) VALUES
                                                               ('Ingeniería en Informática 2021', 1, 'Grado'),
                                                               ('Maestría en Informática 2021', 1, 'Posgrado'),
                                                               ('Administración de Empresas 2020', 2, 'Grado'),
                                                               ('Psicología Clínica 2019', 4, 'Grado'),
                                                               ('Dirección Avanzada de Empresas 2010', 3, 'Posgrado'),
                                                               ('Ingeniería en Electrónica 2022', 1, 'Grado'),
                                                               ('Maestría en Dirección de Empresas 2022', 3, 'Posgrado'),
                                                               ('Psicología Organizacional 2022', 4, 'Posgrado');


INSERT INTO participanteProgramaAcademico (ci_participante, nombre_plan, rol) VALUES
                                                                                  (55992757, 'Ingeniería en Informática 2021',        'Docente'),
                                                                                  (10000020, 'Ingeniería en Informática 2021',        'Alumno'),
                                                                                  (10000014, 'Ingeniería en Informática 2021',        'Alumno'),
                                                                                  (10000008, 'Maestría en Informática 2021',          'Docente'),
                                                                                  (10000070, 'Administración de Empresas 2020',       'Alumno'),
                                                                                  (10010089, 'Ingeniería en Informática 2021',        'Alumno'),
                                                                                  (10020082, 'Psicología Clínica 2019',               'Alumno'),
                                                                                  (10040094, 'Psicología Organizacional 2022',        'Alumno'),
                                                                                  (10030091, 'Ingeniería en Electrónica 2022',        'Alumno'),
                                                                                  (10050100, 'Maestría en Dirección de Empresas 2022','Alumno');

INSERT INTO edificio (nombre_edificio, direccion, campus) VALUES
                                                              ('Edificio Sacré Coeur','Av. 8 de Octubre 2738','Montevideo'),
                                                              ('Edificio Semprún','Estero Bellaco 2771','Montevideo'),
                                                              ('Edificio Mullin','Comandante Braga 2715','Montevideo'),
                                                              ('Edificio San Ignacio','Cornelio Cantera 2733','Montevideo'),
                                                              ('Edificio Athanasius','Gral. Urquiza 2871','Montevideo'),
                                                              ('Edificio Madre Marta','Av. Garibaldi 2831','Montevideo'),
                                                              ('Casa Xalambrí','Cornelio Cantera 2728','Montevideo'),
                                                              ('Edificio San José','Av. 8 de Octubre 2733','Montevideo'),
                                                              ('Campus Salto', 'Artigas 1251', 'Salto'),
                                                              ('Edificio Candelaria', 'Av. Roosevelt y Florencia, parada 7 y 1/2', 'Punta del este'),
                                                              ('San Fernando', 'Av. Roosevelt y Oslo, parada 7 y 1/2', 'Punta del este');

INSERT INTO salasDeEstudio (nombre_sala, edificio, capacidad, tipo_sala, disponible) VALUES
                                                                                         ('Sala 1', 'Edificio Sacré Coeur', 20, 'Libre', TRUE),
                                                                                         ('Sala 2', 'Edificio Sacré Coeur', 8, 'Docente', TRUE),
                                                                                         ('Sala 3', 'Edificio Sacré Coeur', 4, 'Posgrado', TRUE),
                                                                                         ('Sala 4', 'Edificio Sacré Coeur', 20, 'Libre', FALSE),
                                                                                         ('Sala 5', 'Edificio Sacré Coeur', 8, 'Docente', FALSE),
                                                                                         ('Sala 6', 'Edificio Sacré Coeur', 4, 'Posgrado', FALSE),
                                                                                         ('Sala S1', 'Edificio Semprún', 16, 'Posgrado', TRUE),
                                                                                         ('Sala S2', 'Edificio Semprún', 10, 'Libre', FALSE),
                                                                                         ('Sala S3', 'Edificio Semprún', 10, 'Libre', TRUE),
                                                                                         ('Sala S4', 'Edificio Semprún', 10, 'Docente', TRUE),
                                                                                         ('Sala Mullin 1', 'Edificio Mullin', 12, 'Posgrado', TRUE),
                                                                                         ('Sala Mullin 2', 'Edificio Mullin', 6, 'Libre', TRUE),
                                                                                         ('Sala Mullin 3', 'Edificio Mullin', 6, 'Docente', TRUE),
                                                                                         ('Sala San Ignacio A', 'Edificio San Ignacio', 15, 'Docente', TRUE),
                                                                                         ('Sala San Ignacio B', 'Edificio San Ignacio', 10, 'Libre', TRUE),
                                                                                         ('Sala Athanasius 1A', 'Edificio Athanasius', 14, 'Posgrado', FALSE),
                                                                                         ('Sala Athanasius 2B', 'Edificio Athanasius', 8, 'Libre', TRUE),
                                                                                         ('Sala Madre Marta 1', 'Edificio Madre Marta', 12, 'Docente', TRUE),
                                                                                         ('Sala Madre Marta 2', 'Edificio Madre Marta', 6, 'Libre', TRUE),
                                                                                         ('Sala X1', 'Casa Xalambrí', 10, 'Libre', FALSE),
                                                                                         ('Sala X2', 'Casa Xalambrí', 10, 'Libre', FALSE),
                                                                                         ('Sala SJ 1', 'Edificio San José', 18, 'Posgrado', TRUE),
                                                                                         ('Sala SJ 2', 'Edificio San José', 8, 'Docente', TRUE),
                                                                                         ('Sala Sal1', 'Campus Salto', 20, 'Libre', TRUE),
                                                                                         ('Sala Sal2', 'Campus Salto', 10, 'Posgrado', TRUE),
                                                                                         ('Sala C1', 'Edificio Candelaria', 14, 'Docente', TRUE),
                                                                                         ('Sala SF1', 'San Fernando', 12, 'Libre', TRUE),
                                                                                         ('Sala SF2', 'San Fernando', 20, 'Posgrado', FALSE);

INSERT INTO turno (hora_inicio, hora_fin) VALUES
                                              ('08:00:00', '09:00:00'),
                                              ('09:00:00', '10:00:00'),
                                              ('10:00:00', '11:00:00'),
                                              ('11:00:00', '12:00:00'),
                                              ('12:00:00', '13:00:00'),
                                              ('13:00:00', '14:00:00'),
                                              ('14:00:00', '15:00:00'),
                                              ('15:00:00', '16:00:00'),
                                              ('16:00:00', '17:00:00'),
                                              ('17:00:00', '18:00:00'),
                                              ('18:00:00', '19:00:00'),
                                              ('19:00:00', '20:00:00'),
                                              ('20:00:00', '21:00:00'),
                                              ('21:00:00', '22:00:00'),
                                              ('22:00:00', '23:00:00');


INSERT INTO reserva (nombre_sala, edificio, fecha, id_turno, ci_organizador, estado) VALUES
                                                                                         ('Sala 1',        'Edificio Sacré Coeur', '2025-12-01', 1, 55992757, 'Cancelada'),
                                                                                         ('Sala 2',        'Edificio Sacré Coeur', '2025-12-02', 2, 10000020, 'Cancelada'),
                                                                                         ('Sala S1',       'Edificio Semprún',     '2025-12-03', 3, 10000014, 'Cancelada'),
                                                                                         ('Sala Mullin 1', 'Edificio Mullin',      '2025-12-04', 4, 55992757, 'Cancelada'),
                                                                                         ('Sala SJ 1',     'Edificio San José',    '2025-12-05', 5, 10000008, 'Cancelada'),
                                                                                         ('Sala Sal1',     'Campus Salto',         '2025-12-06', 6, 10000014, 'Activa'),
                                                                                         ('Sala C1',       'Edificio Candelaria',  '2025-12-07', 7, 10000020, 'Activa'),
                                                                                         ('Sala SF1',      'San Fernando',         '2025-12-08', 8, 55992757, 'Activa'),
                                                                                         ('Sala 3',        'Edificio Sacré Coeur', '2025-12-09', 2, 10010089, 'Activa'),
                                                                                         ('Sala 5',        'Edificio Sacré Coeur', '2025-12-10', 3, 10020082, 'Activa'),
                                                                                         ('Sala S3',       'Edificio Semprún',     '2025-12-11', 4, 10040094, 'Activa'),
                                                                                         ('Sala Mullin 2', 'Edificio Mullin',      '2025-12-12', 5, 10030091, 'Activa'),
                                                                                         ('Sala San Ignacio A', 'Edificio San Ignacio', '2025-12-13', 6, 10050100, 'Activa');

INSERT INTO reserva (nombre_sala, edificio, fecha, id_turno, ci_organizador, estado) VALUES
                                                                                         ('Sala 1',             'Edificio Sacré Coeur',  '2025-11-20', 1, 55992757, 'Finalizada'),
                                                                                         ('Sala S2',            'Edificio Semprún',      '2025-11-05', 2, 10000020, 'Finalizada'),
                                                                                         ('Sala Athanasius 2B', 'Edificio Athanasius',   '2026-01-02', 3, 55992757, 'Cancelada'),
                                                                                         ('Sala Madre Marta 1', 'Edificio Madre Marta',  '2025-11-22', 4, 10000020, 'Sin asistencia'),
                                                                                         ('Sala Mullin 3',      'Edificio Mullin',       '2025-11-18', 5, 10000014, 'Finalizada'),
                                                                                         ('Sala San Ignacio B', 'Edificio San Ignacio',  '2025-12-15', 6, 10000008, 'Cancelada');

INSERT INTO reservaParticipante (ci_participante, id_reserva, asistencia, confirmacion, resenado) VALUES
                                                                                                      (55992757,  1, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (10000008,  1, 'Asiste',    'Pendiente',  FALSE),
                                                                                                      (10000014,  1, 'No asiste', 'Rechazado',  FALSE),

                                                                                                      (10000020,  2, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (55992757,  2, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10000014,  3, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (55992757,  3, 'No asiste', 'Pendiente',  FALSE),

                                                                                                      (55992757,  4, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (10000008,  4, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10000020,  4, 'No asiste', 'Pendiente',  FALSE),

                                                                                                      (10000008,  5, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (55992757,  5, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10000008,  6, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (10000014,  6, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10000020,  6, 'No asiste', 'Pendiente',  FALSE),

                                                                                                      (10000020,  7, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10000008,  7, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (55992757,  8, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10000008,  8, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10000014,  8, 'No asiste', 'Pendiente',  FALSE),

                                                                                                      (55992757,  9, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (10000014,  9, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (10010089,  9, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10000020, 10, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10020082, 10, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (55992757, 10, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (10000008, 10, 'Asiste',    'Confirmado', TRUE),

                                                                                                      (10000014, 11, 'No asiste', 'Confirmado', FALSE),
                                                                                                      (10040094, 11, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10000008, 12, 'Asiste',    'Pendiente',  FALSE),
                                                                                                      (10030091, 12, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10010089, 13, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10020082, 13, 'Asiste',    'Pendiente',  FALSE),
                                                                                                      (10050100, 13, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10020082, 14, 'Asiste',    'Confirmado', TRUE),
                                                                                                      (55992757, 14, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10040094, 15, 'No asiste', 'Rechazado',  FALSE),
                                                                                                      (10000020, 15, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10030091, 16, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10050100, 16, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (55992757, 16, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10000020, 17, 'No asiste',    'Confirmado', FALSE),
                                                                                                      (10000014, 17, 'No asiste', 'Confirmado', FALSE),
                                                                                                      (10000070, 17, 'No asiste', 'Confirmado', FALSE),

                                                                                                      (10000014, 18, 'Asiste',    'Confirmado', FALSE),
                                                                                                      (10000020, 18, 'Asiste',    'Confirmado', FALSE),

                                                                                                      (10000008, 19, 'Asiste',    'Confirmado', FALSE);

INSERT INTO sancion_participante (ci_participante, motivo, fecha_inicio, fecha_fin) VALUES
                                                                                        (10000014, 'Inasistencia', '2025-11-22', '2026-01-22'),
                                                                                        (10000020, 'Inasistencia', '2025-11-22', '2026-01-22'),
                                                                                        (10000070, 'Inasistencia', '2025-11-22', '2026-01-22'),
                                                                                        (10010089, 'Vandalismo',   '2025-12-07', '2025-12-21'),
                                                                                        (10020082, 'Morosidad',    '2025-12-08', '2025-12-22'),
                                                                                        (10050100, 'Morosidad',    '2025-12-06', '2026-12-18');


INSERT INTO resena (id_reserva, ci_participante, puntaje_general, descripcion)
VALUES
    (9,  55992757, 5, 'Sala amplia y silenciosa'),
    (9,  10000014, 3, 'Había algo de ruido en la sala'),
    (10, 55992757, 5, 'Muy buena iluminación y espacio'),
    (10, 10000008, 4, 'Sala cómoda, pero la computadora tenía fallas');


DROP USER IF EXISTS 'ucurooms_app'@'%';
DROP USER IF EXISTS 'ucurooms_participante'@'%';
DROP USER IF EXISTS 'ucurooms_funcionario'@'%';
DROP USER IF EXISTS 'ucurooms_admin'@'%';
DROP USER IF EXISTS 'ucurooms_login'@'%';

CREATE USER 'ucurooms_login'@'%' IDENTIFIED BY 'login_pass';
GRANT SELECT ON DevOpsSalones.usuario TO 'ucurooms_login'@'%';
GRANT SELECT ON DevOpsSalones.login  TO 'ucurooms_login'@'%';

CREATE USER 'ucurooms_app'@'%' IDENTIFIED BY 'ucurooms_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON DevOpsSalones.* TO 'ucurooms_app'@'%';

CREATE USER 'ucurooms_participante'@'%' IDENTIFIED BY 'participante_pass';
GRANT SELECT ON DevOpsSalones.* TO 'ucurooms_participante'@'%';
GRANT INSERT ON DevOpsSalones.reserva TO 'ucurooms_participante'@'%';
GRANT INSERT ON DevOpsSalones.reservaParticipante TO 'ucurooms_participante'@'%';
GRANT INSERT ON DevOpsSalones.resena TO 'ucurooms_participante'@'%';
GRANT UPDATE (puntaje) ON DevOpsSalones.salasDeEstudio TO 'ucurooms_participante'@'%';
GRANT UPDATE ON DevOpsSalones.reserva TO 'ucurooms_participante'@'%';
GRANT UPDATE, DELETE ON DevOpsSalones.reservaParticipante TO 'ucurooms_participante'@'%';
GRANT UPDATE  ON DevOpsSalones.login TO 'ucurooms_participante'@'%';


CREATE USER 'ucurooms_funcionario'@'%' IDENTIFIED BY 'funcionario_pass';
GRANT SELECT ON DevOpsSalones.* TO 'ucurooms_funcionario'@'%';
GRANT INSERT, UPDATE, DELETE ON DevOpsSalones.reserva TO 'ucurooms_funcionario'@'%';
GRANT INSERT, UPDATE, DELETE ON DevOpsSalones.reservaParticipante TO 'ucurooms_funcionario'@'%';
GRANT INSERT, UPDATE, DELETE ON DevOpsSalones.sancion_participante TO 'ucurooms_funcionario'@'%';
GRANT INSERT, UPDATE, DELETE ON DevOpsSalones.resena TO 'ucurooms_funcionario'@'%';
GRANT UPDATE  ON DevOpsSalones.login TO 'ucurooms_funcionario'@'%';


CREATE USER 'ucurooms_admin'@'%' IDENTIFIED BY 'admin_pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON DevOpsSalones.* TO 'ucurooms_admin'@'%';

FLUSH PRIVILEGES
