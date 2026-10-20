import { useAuth } from "../../contexts/auth";
import Navbar from "../../components/Navbar";
import SidebarAdmin from "../../components/sidebarAdmin.jsx";
import Footer from "../../components/Footer.jsx";
import NavButton from "../../components/NavButton.jsx";

export default function FuncionarioPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-dvh flex flex-col">
            <Navbar />
            <div className="flex min-w-0 flex-col lg:flex-row flex-1 bg-gradient-to-b from-slate-200 to-blue-100">
                <SidebarAdmin />
                <main className="min-w-0 flex-1 overflow-auto flex items-center justify-center">
                    <div className="w-full px-4 py-8">
                        <header className="mb-8 text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
                                Bienvenido, {user?.nombre}
                            </h2>
                            <p className="mt-2 text-slate-600 text-sm sm:text-base">
                                Desde aquí podrás administrar las reservas y verificar reservas.
                            </p>
                        </header>

                        <section className="flex justify-center items-center">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                                <NavButton
                                    href="/stats"
                                    name="Estadísticas"
                                />
                                <NavButton
                                    href="/reservas"
                                    name="Reservas"
                                />
                                <NavButton
                                    href="/sanciones"
                                    name="Sanciones"
                                />
                                <NavButton
                                    href="/reseñas"
                                    name="Reseñas"
                                />
                            </div>
                        </section>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}