import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
import ParticipantePage from "./pages/participante/ParticipantePage.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";
import FuncionarioPage from "./pages/funcionario/FuncionarioPage.jsx";
import PerfilPage from "./pages/PerfilPage";
import SessionExpiredPage from "./pages/SessionExpiredPage.jsx";
import StatsPage from "./pages/stats/StatsPage";
import SancionesPage from "./pages/admin/Sanciones.jsx";
import ReseniasPage from "./pages/admin/Resenias.jsx";
import ReservasPage from "./pages/admin/Reservas.jsx";
import UsuariosPage from "./pages/admin/Usuarios.jsx";
import SalasPage from "./pages/admin/SalasPage.jsx";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RegisterForm from "./pages/RegisterForm.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Navigate to="/login" />} path="/" exact />

          <Route element={<LoginPage />} path="/login" exact />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/session-expired" element={<SessionExpiredPage />} />

          <Route element={<ProtectedRoute requiredRole="Participante" />}>
            <Route path="/participante" element={<ParticipantePage />} />
          </Route>

          <Route element={<ProtectedRoute requiredRole="Funcionario" />}>
            <Route path="/funcionario" element={<FuncionarioPage />} />
          </Route>

                        <Route element={<ProtectedRoute requiredRole="Administrador"/>}>
                            <Route path="/admin" element={<AdminPage/>}/>
                            <Route path="/salas" element={<SalasPage />} />
                            <Route path="/usuarios" element={<UsuariosPage/>}/>
                            <Route path="/registro" element={<RegisterForm/>}/>
                        </Route>

                        <Route element={<ProtectedRoute requiredRoles={["Administrador", "Funcionario"]}/>}>
                            <Route path="/sanciones" element={<SancionesPage/>}/>
                            <Route path="/stats" element={<StatsPage/>}/>
                            <Route path="/reseñas" element={<ReseniasPage/>}/>
                            <Route path="/reservas" element={<ReservasPage/>}/>
                        </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="light"
      />
    </AuthProvider>
  );
}

export default App;