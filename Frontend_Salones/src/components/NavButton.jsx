import { Link } from "react-router-dom";

export default function NavButton({ href, name }) {
  return (
    <Link
      className="min-h-28 w-full p-4 sm:min-h-36 sm:p-6 group flex flex-col items-center justify-center bg-blue-50 shadow-sm rounded-2xl border border-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-700"
      to={href}
    >
      <p className="text-center font-bold text-slate-900 group-hover:text-blue-700">{name}</p>
    </Link>
  );
}
