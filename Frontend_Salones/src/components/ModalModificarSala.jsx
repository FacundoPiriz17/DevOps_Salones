import ResponsiveModal from "./ResponsiveModal";
import { useState, useEffect } from "react";

export default function ModalModificarSala({ open, onClose, onConfirm, sala }) {
  const [formData, setFormData] = useState({
    capacidad: "",
    tipo_sala: "Libre",
    equipamiento: "",
    disponible: true,
    puntaje: "3",
  });

  useEffect(() => {
    if (sala) {
      setFormData({
        capacidad: sala.capacidad?.toString() || "",
        tipo_sala: sala.tipo_sala || "Libre",
        equipamiento: sala.equipamiento || "",
        disponible: sala.disponible ?? true,
        puntaje: sala.puntaje?.toString() || "3",
      });
    }
  }, [sala]);

  if (!open || !sala) return null;

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onConfirm(formData);
  };

  return (
    <ResponsiveModal title="Modificar sala" onClose={onClose} className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">
          Modificar Sala: {sala.nombre_sala}
        </h2>
        <p className="text-gray-600 text-sm mb-4">Edificio: {sala.edificio}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidad
            </label>
            <input
              type="number"
              name="capacidad"
              value={formData.capacidad}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Sala
            </label>
            <select
              name="tipo_sala"
              value={formData.tipo_sala}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Libre">Libre</option>
              <option value="Posgrado">Posgrado</option>
              <option value="Docente">Docente</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="block w-full text-sm font-medium text-gray-700">
              Equipamiento
              <input
                type="text"
                name="equipamiento"
                value={formData.equipamiento}
                onChange={handleChange}
                placeholder="Proyector, pizarra..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="disponible"
              checked={formData.disponible}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Disponible
            </label>
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
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      
    </ResponsiveModal>
  );
}
