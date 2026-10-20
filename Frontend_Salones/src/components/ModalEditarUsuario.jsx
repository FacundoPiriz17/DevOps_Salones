import ResponsiveModal from "./ResponsiveModal";
import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api.js";
import { FiPlusCircle, FiX } from "react-icons/fi";

export default function ModalEditarUsuario({ open, onClose, usuario, token, onConfirm }) {
    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        email: "",
        rol: "",
        contrasena: ""
    });

    // 🔹 Estado para programas/carreras
    const [programas, setProgramas] = useState([]);
    const [planesDisponibles, setPlanesDisponibles] = useState([]);
    const [loadingPlanes, setLoadingPlanes] = useState(false);
    const [errorPlanes, setErrorPlanes] = useState("");

    const [nombrePlan, setNombrePlan] = useState("");
    const [rolAcademico, setRolAcademico] = useState("Alumno");

    useEffect(() => {
        if (usuario) {
            setForm({
                nombre: usuario.nombre || "",
                apellido: usuario.apellido || "",
                email: usuario.email || "",
                rol: usuario.rol || "Participante",
                contrasena: ""
            });

            if (usuario.rol === "Participante" && Array.isArray(usuario.programas)) {
                setProgramas(
                    usuario.programas.map((p) => ({
                        nombre_plan: p.nombre_plan,
                        rol: p.rol
                    }))
                );
            } else {
                setProgramas([]);
            }
        } else {
            setForm({
                nombre: "",
                apellido: "",
                email: "",
                rol: "Participante",
                contrasena: ""
            });
            setProgramas([]);
        }
        setNombrePlan("");
        setRolAcademico("Alumno");
    }, [usuario]);

    useEffect(() => {
        if (!open) return;

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
    }, [open, token]);

    if (!open) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "rol") {
            setForm((prev) => ({ ...prev, [name]: value }));
            if (value !== "Participante") {
                setProgramas([]);
                setNombrePlan("");
                setRolAcademico("Alumno");
            }
            return;
        }

        setForm({ ...form, [name]: value });
    };

    const handleAgregarPrograma = () => {
        if (!nombrePlan || !rolAcademico) {
            alert("Selecciona un plan y un rol académico antes de agregar.");
            return;
        }

        if (programas.some((p) => p.nombre_plan === nombrePlan)) {
            alert("Ya agregaste ese plan académico.");
            return;
        }

        setProgramas((prev) => [
            ...prev,
            { nombre_plan: nombrePlan, rol: rolAcademico }
        ]);

        setNombrePlan("");
        setRolAcademico("Alumno");
    };

    const handleEliminarPrograma = (nombre_plan) => {
        setProgramas((prev) => prev.filter((p) => p.nombre_plan !== nombre_plan));
    };

    const handleSubmit = async () => {
        try {
            const body = {
                nombre: form.nombre.trim(),
                apellido: form.apellido.trim(),
                email: form.email.trim(),
                rol: form.rol
            };

            if (form.contrasena && form.contrasena.trim() !== "") {
                body.contrasena = form.contrasena;
            }

            if (form.rol === "Participante") {
                body.programas = programas;
            }
            console.log("DEBUG PUT usuario:", usuario, "body:", body);

            await apiFetch(`/login/usuarios/${usuario.ci}`, {
                method: "PUT",
                body,
                token
            });

            onConfirm();
            onClose();
        } catch (err) {
            console.error("Error actualizando usuario:", err);
            alert("No se pudo actualizar el usuario");
        }
    };

    return (
        <ResponsiveModal title="Editar usuario" onClose={onClose} className="max-w-md rounded-2xl bg-white shadow-xl">
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                    <h2 className="text-xl font-bold mb-4">
                        {usuario ? "Editar Usuario" : "Añadir Usuario"}
                    </h2>

                    <div className="flex flex-col gap-3">
                        <p>Nombre:</p>
                        <input
                            type="text"
                            name="nombre"
                            placeholder="Nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            className="border p-2 rounded"
                        />
                        <p>Apellido:</p>
                        <input
                            type="text"
                            name="apellido"
                            placeholder="Apellido"
                            value={form.apellido}
                            onChange={handleChange}
                            className="border p-2 rounded"
                        />
                        <p>Email:</p>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={handleChange}
                            className="border p-2 rounded"
                        />

                        <p>Rol:</p>
                        <select
                            name="rol"
                            value={form.rol}
                            onChange={handleChange}
                            className="border p-2 rounded"
                        >
                            <option value="Participante">Participante</option>
                            <option value="Funcionario">Funcionario</option>
                            <option value="Administrador">Administrador</option>
                        </select>

                        {form.rol === "Participante" && (
                            <div className="space-y-3 border border-gray-200 rounded-md p-3 bg-gray-50">
                                <p className="text-sm font-semibold text-blue-900">
                                    Carreras / programas del participante
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
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-100 bg-white px-3 py-1 text-xs sm:text-sm"
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
                                        value={nombrePlan}
                                        onChange={(e) => setNombrePlan(e.target.value)}
                                        disabled={
                                            loadingPlanes ||
                                            planesDisponibles.length === 0
                                        }
                                        className="w-full border border-gray-400 p-2 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="">
                                            {loadingPlanes
                                                ? "Cargando planes..."
                                                : "Selecciona un plan"}
                                        </option>
                                        {planesDisponibles.map((p) => (
                                            <option
                                                key={p.nombre_plan}
                                                value={p.nombre_plan}
                                            >
                                                {p.nombre_plan}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <select
                                            value={rolAcademico}
                                            onChange={(e) =>
                                                setRolAcademico(e.target.value)
                                            }
                                            className="flex-1 border border-gray-400 p-2 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                                        >
                                            <option value="Alumno">Alumno</option>
                                            <option value="Docente">Docente</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={handleAgregarPrograma}
                                            disabled={
                                                loadingPlanes ||
                                                planesDisponibles.length === 0
                                            }
                                            className="inline-flex items-center justify-center rounded-md border border-blue-500 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <FiPlusCircle className="mr-1" />
                                            Agregar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p>Contraseña (dejar vacío para no cambiar):</p>
                        <input
                            type="password"
                            name="contrasena"
                            placeholder="Contraseña"
                            value={form.contrasena}
                            onChange={handleChange}
                            className="border p-2 rounded"
                        />
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded border hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-800 transition"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            
        </ResponsiveModal>
    );
}