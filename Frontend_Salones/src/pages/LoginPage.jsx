import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth";
import { RiEyeCloseLine, RiEyeFill } from "react-icons/ri";
import ucuRoomsLogo from "../assets/ucurooms.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const passwordRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await login(email, contrasena);
      if (result.ok) {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        const destinations = { Participante: "/participante", Funcionario: "/funcionario", Administrador: "/admin" };
        navigate(destinations[storedUser?.rol] || "/unauthorized");
      } else {
        setError(result.error || "Usuario o contraseña inválidos.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-8" aria-labelledby="login-title">
        <img src={ucuRoomsLogo} alt="UCU Salones" className="mx-auto mb-4 h-20 w-20 object-contain sm:h-24 sm:w-24" />
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-blue-700">Proyecto DevOps</p>
        <h1 id="login-title" className="text-center text-2xl font-semibold text-blue-950 sm:text-3xl">Iniciar sesión</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-600">Reservá y gestioná tus salas de estudio.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">Correo institucional</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  passwordRef.current?.focus();
                }
              }}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
            <div className="relative">
              <input
                id="login-password"
                ref={passwordRef}
                type={mostrarContrasena ? "text" : "password"}
                autoComplete="current-password"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                className="w-full rounded-xl border border-slate-300 py-3 pl-3 pr-12 text-base focus:border-blue-500"
                required
              />
              <button
                type="button"
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={mostrarContrasena}
                onClick={() => setMostrarContrasena((value) => !value)}
                className="absolute inset-y-0 right-0 flex items-center justify-center rounded-xl text-xl text-slate-600 hover:text-blue-700"
              >
                {mostrarContrasena ? <RiEyeFill /> : <RiEyeCloseLine />}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-900 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Ingresando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">UCU · Gestión de Salas</p>
      </section>
    </main>
  );
}
