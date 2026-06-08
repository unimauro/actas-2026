// Acceso de administrador por contraseña simple (sin correo).
// Define ADMIN_PASSWORD en el entorno. El panel /admin la pide una vez.
export function adminOk(pwd?: string | null): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  return pwd === real;
}
