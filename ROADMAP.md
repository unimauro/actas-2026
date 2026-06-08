# 🗺️ Roadmap — Actas Abiertas 2026

Documento vivo. Marca con `[x]` lo que se vaya completando. Nació como experimento de un día (7-8 jun 2026); esto es por dónde seguir.

---

## ✅ Hecho (MVP funcional, en producción)

- [x] Subida de actas desde el celular (PWA) con compresión en el navegador (~5 MB → ~250 KB)
- [x] OCR con Google Gemini (`gemini-flash-latest`) — lee mesa, ubicación, votos, miembros
- [x] Validación aritmética (Σ votos = total = ciudadanos ≤ hábiles); regla "hábiles" opcional
- [x] Soporte de **Acta Electoral** y **Cartel de Resultados** (detección de tipo)
- [x] Antiduplicados por número de mesa (índice único) + detección de conflictos
- [x] Formulario de revisión con campos coloreados por confianza
- [x] Dashboard en vivo: head-to-head, % avance, por distrito, feed, buscador (solo numérico)
- [x] Comparación vs ONPE con **datos editables + histórico** (snapshots con fecha/hora)
- [x] Panel `/admin` con contraseña: tabla de envíos (correo/DNI/IP), cambio de estado, alta de snapshot ONPE
- [x] Trazabilidad: IP + datos de personero + logs estructurados
- [x] Tarjeta dinámica para redes (Open Graph) + favicon + botones compartir
- [x] Google Analytics (visitantes)
- [x] Script de carga por lote desde imágenes (con delay anti-rate-limit y guardia de mesa inválida)
- [x] Deploy en Netlify (`conteojp.netlify.app`) + repo público + README + LICENSE

---

## 🔜 Próximo (alto valor, poco esfuerzo)

- [ ] **Guardar la imagen del acta** en Supabase Storage (auditoría) — hoy el OCR la lee pero no la archiva
- [ ] **`SUPABASE_SECRET_KEY`** en producción para que el admin pueda editar estados (RLS hoy lo bloquea)
- [ ] **Resolución de conflictos** en el admin (cuando una mesa llega 2 veces con números distintos: ver ambas, elegir/marcar)
- [ ] **Export CSV / datos abiertos** del conteo (descarga pública para auditoría)
- [ ] **Evento Analytics `acta_subida`** (medir actas subidas, no solo visitas)
- [ ] **Reproceso de fallidas**: cola para reintentar OCR de las que fallaron por rate-limit
- [ ] Dominio propio (ej. `actas2026.pe`) en vez del subdominio Netlify

## 🌅 Más adelante (Fase 2)

- [ ] **Bot de WhatsApp**: subir actas por chat (Cloud API / Twilio) reusando el mismo backend
- [ ] **Verificación real del personero**:
  - [ ] OTP por correo (Resend) — requiere dominio verificado, o
  - [ ] OTP por WhatsApp, o
  - [ ] Validación de DNI contra RENIEC (API gratuita) + cruce de nombre
- [ ] **Doble verificación** (dos personas suben la misma mesa a ciegas → "mesa verificada" si coinciden)
- [ ] **Mapa por distrito** (coropleta) y representatividad de la muestra (peso geográfico)
- [ ] **Detección de anomalías** estadísticas (actas atípicas → bandera para revisión)
- [ ] **Recolector ONPE desde Perú**: mini-script en IP peruana que lee el sitio (geobloqueado) y hace POST a `/api/onpe` automáticamente

## 🛡️ Robustez y seguridad

- [ ] Rate limiting / anti-spam en `/api/actas` (Vercel/Netlify firewall o middleware)
- [ ] Endurecer RLS: cerrar inserts directos con la llave publishable (forzar vía secret key del servidor)
- [ ] Rotación de llaves documentada; checklist de "no subir secretos"
- [ ] Manejo de cuota Gemini: detectar 429, backoff, o cambiar a facturación con alertas de costo
- [ ] Pruebas automatizadas (validación, dedup, parsing OCR) + CI

## 🎨 UX / Producto

- [ ] Modo claro/oscuro y mejoras de accesibilidad (a11y)
- [ ] Vista de "mi aporte" para cada personero (cuántas mesas subió)
- [ ] Gráficos de evolución temporal (nuestro conteo vs ONPE en el tiempo)
- [ ] App móvil nativa (React Native) si se quiere ir más allá de la PWA
- [ ] Internacionalización del documento (otros procesos electorales / países)

## 💡 Ideas / investigación

- [ ] Lectura del **código QR / código de barras** del acta para validar el número de mesa (anti-error)
- [ ] OCR alternativo/local (Qwen-VL, etc.) para no depender de cuota
- [ ] Firma/hash del acta original para prueba de integridad pública
- [ ] Conteo de otras elecciones (1ra vuelta: 5 actas por mesa — congreso, senadores, parlamento andino)

---

> **Filosofía**: transparencia ciudadana, anti-overclaiming. No reemplaza a la ONPE; la complementa con verificación abierta y auditable.
