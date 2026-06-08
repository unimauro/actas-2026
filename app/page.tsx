import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent p-8">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Cuenta tú también las actas <span className="text-sky-400">2026</span>
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Sube la foto del acta de tu mesa. La IA lee los números manuscritos, tú confirmas o
          corriges, y el conteo ciudadano se actualiza en vivo. Una mesa = un acta: las repetidas
          quedan bloqueadas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/subir" className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white hover:bg-sky-400">
            📸 Subir un acta
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-white/20 px-5 py-3 font-semibold hover:bg-white/10">
            📊 Ver el avance
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Subes la foto", "Se comprime en tu celular antes de subir (de 5MB a ~250KB)."],
          ["2. La IA pre-llena", "Lee mesa, ubicación y todos los votos. Marca en amarillo lo dudoso."],
          ["3. Validas y aceptas", "La suma debe cuadrar con el total. Corriges y registras."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-semibold text-sky-300">{t}</h3>
            <p className="mt-1 text-sm text-white/60">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
