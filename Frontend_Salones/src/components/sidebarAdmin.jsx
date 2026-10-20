import { useState } from "react";
import { FaChartBar, FaCalendarAlt, FaBuilding, FaBan, FaStar, FaUser, FaBars, FaTimes, FaHome } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/auth";

export default function SidebarAdmin() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.rol === "Administrador";
  if (!isAdmin && user?.rol !== "Funcionario") return null;

  const items = [
    { icon: FaHome, label: "Inicio", href: isAdmin ? "/admin" : "/funcionario" },
    { icon: FaChartBar, label: "Estadísticas", href: "/stats" },
    { icon: FaCalendarAlt, label: "Reservas", href: "/reservas" },
    ...(isAdmin ? [{ icon: FaBuilding, label: "Salas", href: "/salas" }] : []),
    { icon: FaBan, label: "Sanciones", href: "/sanciones" },
    { icon: FaStar, label: "Reseñas", href: "/reseñas" },
    ...(isAdmin ? [{ icon: FaUser, label: "Usuarios", href: "/usuarios" }] : []),
  ];

  return (
    <aside className="w-full shrink-0 border-t border-white/10 bg-[#0b1743] text-white lg:sticky lg:top-20 lg:h-[calc(100dvh-5rem)] lg:w-60 lg:self-start lg:overflow-y-auto">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold lg:hidden"
        aria-expanded={open}
        aria-controls="management-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        Menú de gestión
        {open ? <FaTimes aria-hidden="true" /> : <FaBars aria-hidden="true" />}
      </button>
      <nav id="management-navigation" aria-label="Gestión de salas" className={`${open ? "block" : "hidden"} p-3 lg:block lg:py-6`}>
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-blue-600 text-white" : "text-slate-200 hover:bg-white/10"}`}
              >
                <item.icon className="shrink-0 text-lg" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
