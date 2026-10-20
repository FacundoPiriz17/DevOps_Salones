import { useAuth } from "../../contexts/auth";
import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import NavButton from "../../components/NavButton.jsx";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";

export default function AdminPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-dvh flex flex-col">
            <Navbar />
            <div className="flex min-w-0 flex-col lg:flex-row flex-1 bg-gradient-to-b from-slate-200 to-blue-100">
                <SidebarAdmin />
                <main className="min-w-0 flex-1 flex justify-center items-center overflow-auto px-4 py-10">
                    <div className="w-full max-w-5xl mx-auto">
                    <header className="mb-6 text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
                                Bienvenido, {user?.nombre}
                            </h2>
                            <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
                                Desde aquí podrás gestionar usuarios, roles, reservas, reseñas y
                                estadísticas del sistema.
                            </p>
                        </header>

                        <section>
                            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 text-center">
                                Panel de administración
                            </h3>

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4 max-w-4xl mx-auto">
                                <div className="min-w-0">
                                    <NavButton
                                        href="/stats"
                                        name="Estadísticas"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <NavButton
                                        href="/reservas"
                                        name="Reservas"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <NavButton
                                        href="/salas"
                                        name="Salas"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <NavButton
                                        href="/sanciones"
                                        name="Sanciones"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <NavButton
                                        href="/reseñas"
                                        name="Reseñas"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <NavButton
                                        href="/usuarios"
                                        name="Usuarios"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}