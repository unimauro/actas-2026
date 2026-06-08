"use client";

import { useState } from "react";

export interface Personero {
  personero_dni: string;
  email: string;
  personero_nombre: string;
}

export default function DatosPersonero({ onListo }: { onListo: (p: Personero) => void }) {
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  function continuar() {
    setError(null);
    if (!/^\d{8}$/.test(dni.trim())) {
      setError("Ingresa tu DNI (8 dígitos).");
      return;
    }
    onListo({ personero_dni: dni.trim(), email: email.trim(), personero_nombre: nombre.trim() });
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold">Tus datos para subir actas</h2>
      <p className="mt-1 text-sm text-white/50">
        Quedan registrados junto a cada acta que subas (con tu IP) para trazabilidad. Los completas una sola vez.
      </p>

      {error && <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-white/50">DNI <span className="text-red-400">*</span></span>
          <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="8 dígitos" inputMode="numeric"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-sky-400" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/50">Correo <span className="text-white/30">(opcional)</span></span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" type="email"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-sky-400" />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs text-white/50">
            Nombre <span className="text-white/30">(opcional)</span>
            <span title="Puedes dejarlo vacío. Sirve solo para identificar quién subió el acta." className="cursor-help text-white/40">ⓘ</span>
          </span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="opcional"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-sky-400" />
        </label>
        <button onClick={continuar} className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-400">
          Empezar a subir actas
        </button>
      </div>
    </div>
  );
}
