import ResponsiveModal from "./ResponsiveModal";
import { useState } from "react";

export default function ModalAgregarSala({ open, onClose, onConfirm, edificios = [] }) {
    const [formData, setFormData] = useState({
        nombre_sala: "",
        edificio: "",
        capacidad: "",
        tipo_sala: "Libre",
        puntaje: "3",
    });

    if (!open) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onConfirm(formData);
        setFormData({
            nombre_sala: "",
            edificio: "",
            capacidad: "",
            tipo_sala: "Libre",
            puntaje: "3",
        });
    };

    return (
        <ResponsiveModal title="Agregar sala" onClose={onClose} className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-blue-800 mb-4">
                    Agregar Nueva Sala
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre de la Sala *
                        </label>
                        <input
                            type="text"
                            name="nombre_sala"
                            value={formData.nombre_sala}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Edificio *
                        </label>
                        <select
                            name="edificio"
                            value={formData.edificio}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Seleccioná un edificio</option>
                            {edificios.map((ed) => (
                                <option
                                    key={ed.id_edificio ?? ed.nombre_edificio}
                                    value={ed.nombre_edificio}
                                >
                                    {ed.nombre_edificio}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacidad *
                        </label>
                        <input
                            type="number"
                            name="capacidad"
                            value={formData.capacidad}
                            onChange={handleChange}
                            min="1"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Sala *
                        </label>
                        <select
                            name="tipo_sala"
                            value={formData.tipo_sala}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="Libre">Libre</option>
                            <option value="Posgrado">Posgrado</option>
                            <option value="Docente">Docente</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition"
                        >
                            Agregar
                        </button>
                    </div>
                </form>
            
        </ResponsiveModal>
    );
}
