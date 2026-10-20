import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/auth";
import { apiFetch } from "../utils/api";
import { RiEyeCloseLine, RiEyeFill } from "react-icons/ri";
import { FiPlusCircle, FiX } from "react-icons/fi";
import ucuRoomsLogo from "../assets/ucurooms.png";

export default function RegisterForm() {
    const { token } = useAuth();

    const [ci, setCi] = useState("");
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [email, setEmail] = useState("");
    const [rol, setRol] = useState("Participante");
    const [contrasena, setContrasena] = useState("");
    const [confirmarContrasena, setConfirmarContrasena] = useState("");

    const [nombrePlan, setNombrePlan] = useState("");
    const [rolAcademico, setRolAcademico] = useState("Alumno");

    const [programas, setProgramas] = useState([]);

    const [planesDisponibles, setPlanesDisponibles] = useState([]);
    const [loadingPlanes, setLoadingPlanes] = useState(false);
    const [errorPlanes, setErrorPlanes] = useState("");

    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarContrasena2, setMostrarContrasena2] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);

    const ciRef = useRef(null);
    const nombreRef = useRef(null);
    const apellidoRef = useRef(null);
    const emailRef = useRef(null);
    const rolRef = useRef(null);
    const planRef = useRef(null);
    const rolAcadRef = useRef(null);
    const contrasenaRef = useRef(null);
    const confirmarRef = useRef(null);

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        let ignore = false;

        async function loadPlanes() {
            try {
                setLoadingPlanes(true);
                setErrorPlanes("");
                const data = await apiFetch("/programas/all", { token });
                if (!ignore) {
                    setPlanesDisponibles(Array.isArray(data.planes) ? data.planes : []);
                }
            } catch {
                if (!ignore) {
                    setPlanesDisponibles([]);
                    setErrorPlanes("No se pudieron cargar los planes académicos.");
                }
            } finally {
                if (!ignore) setLoadingPlanes(false);
            }
        }

        loadPlanes();
        return () => {
            ignore = true;
        };
    }, [token]);

    const handleKeyDown = (e, nextRef) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            }
        }
    };

    const validarEmailUcu = (value) => {
        const v = value.toLowerCase().trim();
        return v.endsWith("@correo.ucu.edu.uy") || v.endsWith("@ucu.edu.uy");
    };

    function esCedulaUruguayaValida(ciStr) {
        const ci = ciStr.replace(/\D/g, "");

        if (ci.length !== 8) return false;

        const digitos = ci.split("").map((d) => parseInt(d, 10));
        const cuerpo = digitos.slice(0, 7);
        const dvIngresado = digitos[7];

        const pesos = [2, 9, 8, 7, 6, 3, 4];

        const suma = cuerpo.reduce(
            (acc, dig, idx) => acc + dig * pesos[idx],
            0
        );

        const dvCalculado = (10 - (suma % 10)) % 10;

        return dvCalculado === dvIngresado;
    }

    const handleAgregarPrograma = () => {
        setError("");
        if (!nombrePlan || !rolAcademico) {
            setError("Selecciona un plan y un rol académico antes de agregar.");
            return;
        }

        if (programas.some((p) => p.nombre_plan === nombrePlan)) {
            setError("Ya agregaste ese plan académico.");
            return;
        }

        setProgramas((prev) => [
            ...prev,
            { nombre_plan: nombrePlan, rol: rolAcademico },
        ]);
        setNombrePlan("");
        setRolAcademico("Alumno");
    };

    const handleEliminarPrograma = (nombre_plan) => {
        setProgramas((prev) => prev.filter((p) => p.nombre_plan !== nombre_plan));
    };

    const handleChangeRol = (nuevoRol) => {
        setRol(nuevoRol);
        setError("");
        if (nuevoRol !== "Participante") {
            setProgramas([]);
            setNombrePlan("");
            setRolAcademico("Alumno");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (
            !ci ||
            !nombre ||
            !apellido ||
            !email ||
            !rol ||
            !contrasena ||
            !confirmarContrasena
        ) {
            setError("Todos los campos obligatorios deben estar completos.");
            return;
        }

        if (!/^\d{8}$/.test(ci)) {
            setError("La cédula debe tener exactamente 8 dígitos numéricos.");
            return;
        }

        if (!esCedulaUruguayaValida(ci)) {
            setError("La cédula ingresada no es válida para el Estado uruguayo.");
            return;
        }

        if (!validarEmailUcu(email)) {
            setError(
                "El email debe ser institucional (@correo.ucu.edu.uy o @ucu.edu.uy)."
            );
            return;
        }

        if (contrasena !== confirmarContrasena) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        if (!["Participante", "Funcionario", "Administrador"].includes(rol)) {
            setError("Rol inválido.");
            return;
        }

        let body = {
            ci: Number(ci),
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.trim(),
            rol,
            contrasena,
        };

        if (rol === "Participante") {
            if (programas.length === 0) {
                setError(
                    "Debes agregar al menos un programa académico para participantes."
                );
                return;
            }
            body.programas = programas;
        }

        try {
            setLoading(true);
            const resp = await apiFetch("/login/registro", {
                method: "POST",
                token,
                body,
            });

            setSuccess(resp.respuesta || "Usuario creado correctamente.");
            setError("");

            setCi("");
            setNombre("");
            setApellido("");
            setEmail("");
            setRol("Participante");
            setContrasena("");
            setConfirmarContrasena("");
            setNombrePlan("");
            setRolAcademico("Alumno");
            setProgramas([]);
            if (ciRef.current) ciRef.current.focus();
        } catch (err) {
            const msg =
                err?.message || err?.error || "Ocurrió un error al registrar el usuario.";
            setError(msg);
            setSuccess("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">

            <div className="relative flex w-full justify-center py-2">
                <div
                    className={`bg-white backdrop-blur-md p-5 sm:p-8 rounded-2xl shadow-xl w-full max-w-md z-10 transform transition-all duration-700 ease-out
                    ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}
                `}
                >
                    <div className="flex justify-center mb-4">
                        <img
                            src={ucuRoomsLogo}
                            alt="UCU Salones · DevOps"
                            className="w-24 h-24 object-contain sm:w-28 sm:h-28 drop-shadow-md"
                        />
                    </div>

                    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-blue-700">Proyecto DevOps</p>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-6 text-blue-900 drop-shadow-md">
                        Registrar usuario
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            ref={ciRef}
                            aria-label="Cédula"
                            inputMode="numeric"
                            maxLength={8}
                            type="text"
                            placeholder="Cédula (8 dígitos)"
                            value={ci}
                            onChange={(e) => setCi(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => handleKeyDown(e, nombreRef)}
                            className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                        />

                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                ref={nombreRef}
                                aria-label="Nombre"
                                autoComplete="given-name"
                                type="text"
                                placeholder="Nombre"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, apellidoRef)}
                                className="w-full sm:w-1/2 border border-gray-400 p-2 rounded placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                            />
                            <input
                                ref={apellidoRef}
                                aria-label="Apellido"
                                autoComplete="family-name"
                                type="text"
                                placeholder="Apellido"
                                value={apellido}
                                onChange={(e) => setApellido(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, emailRef)}
                                className="w-full sm:w-1/2 border border-gray-400 p-2 rounded placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                            />
                        </div>

                        <input
                            ref={emailRef}
                            aria-label="Correo institucional"
                            inputMode="email"
                            autoComplete="username"
                            type="email"
                            placeholder="Correo institucional"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rolRef)}
                            className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                        />

                        <select
                            ref={rolRef}
                            aria-label="Rol en el sistema"
                            value={rol}
                            onChange={(e) => handleChangeRol(e.target.value)}
                            onKeyDown={(e) =>
                                handleKeyDown(
                                    e,
                                    rol === "Participante" ? planRef : contrasenaRef
                                )
                            }
                            className="w-full border border-gray-400 p-2 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                        >
                            <option value="Participante">Participante</option>
                            <option value="Funcionario">Funcionario</option>
                            <option value="Administrador">Administrador</option>
                        </select>

                        {rol === "Participante" && (
                            <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50">
                                <p className="text-sm font-semibold text-blue-900">
                                    Datos de programa académico
                                </p>

                                {errorPlanes && (
                                    <p className="text-xs text-red-500 mb-1">
                                        {errorPlanes}
                                    </p>
                                )}

                                {programas.length > 0 && (
                                    <div className="space-y-2">
                                        {programas.map((p) => (
                                            <div
                                                key={p.nombre_plan}
                                                className="flex items-center justify-between rounded-md border border-blue-100 bg-white px-3 py-1 text-xs sm:text-sm"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-800">
                                                        {p.nombre_plan}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        Rol académico: {p.rol}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEliminarPrograma(p.nombre_plan)
                                                    }
                                                    className="ml-2 text-red-500 hover:text-red-600"
                                                    aria-label="Eliminar programa"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <select
                                        ref={planRef}
                                        aria-label="Plan académico"
                                        value={nombrePlan}
                                        onChange={(e) => setNombrePlan(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, rolAcadRef)}
                                        disabled={loadingPlanes || planesDisponibles.length === 0}
                                        className="w-full border border-gray-400 p-2 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="">
                                            {loadingPlanes
                                                ? "Cargando planes..."
                                                : "Selecciona un plan"}
                                        </option>
                                        {planesDisponibles.map((p) => (
                                            <option key={p.nombre_plan} value={p.nombre_plan}>
                                                {p.nombre_plan}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <select
                                            ref={rolAcadRef}
                                            aria-label="Rol académico"
                                            value={rolAcademico}
                                            onChange={(e) => setRolAcademico(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, contrasenaRef)}
                                            className="flex-1 border border-gray-400 p-2 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                                        >
                                            <option value="Alumno">Alumno</option>
                                            <option value="Docente">Docente</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={handleAgregarPrograma}
                                            disabled={loadingPlanes || planesDisponibles.length === 0}
                                            className="inline-flex items-center justify-center rounded-md border border-blue-500 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <FiPlusCircle className="mr-1" />
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <input
                                ref={contrasenaRef}
                                type={mostrarContrasena ? "text" : "password"}
                                aria-label="Contraseña" autoComplete="new-password" placeholder="Contraseña"
                                value={contrasena}
                                onChange={(e) => setContrasena(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, confirmarRef)}
                                className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                            />
                            <button
                                type="button"
                                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                                onClick={() => setMostrarContrasena((v) => !v)}
                                className="absolute inset-y-0 right-0 flex items-center justify-center text-gray-600 hover:text-blue-500 transition"
                            >
                                {mostrarContrasena ? (
                                    <RiEyeFill className="text-blue-800 text-xl" />
                                ) : (
                                    <RiEyeCloseLine className="text-gray-600 text-xl" />
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                ref={confirmarRef}
                                type={mostrarContrasena2 ? "text" : "password"}
                                aria-label="Confirmar contraseña" autoComplete="new-password" placeholder="Confirmar contraseña"
                                value={confirmarContrasena}
                                onChange={(e) => setConfirmarContrasena(e.target.value)}
                                className="w-full border border-gray-400 p-2 rounded placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                            />
                            <button
                                type="button"
                                aria-label={mostrarContrasena2 ? "Ocultar confirmación" : "Mostrar confirmación"}
                                onClick={() => setMostrarContrasena2((v) => !v)}
                                className="absolute inset-y-0 right-0 flex items-center justify-center text-gray-600 hover:text-blue-500 transition"
                            >
                                {mostrarContrasena2 ? (
                                    <RiEyeFill className="text-blue-800 text-xl" />
                                ) : (
                                    <RiEyeCloseLine className="text-gray-600 text-xl" />
                                )}
                            </button>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm text-center whitespace-pre-line">
                                {error}
                            </p>
                        )}
                        {success && (
                            <p className="text-green-600 text-sm text-center whitespace-pre-line">
                                {success}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-900 text-white p-2 rounded hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                            {loading ? "Registrando..." : "Registrar usuario"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
