# Flujo Claro — frontend Angular

Frontend independiente para registrar ingresos y egresos, revisar el flujo de
caja y preparar pagos proyectados. Está listo para ejecutarse en VS Code,
versionarse en GitHub y desplegarse como SPA en Vercel.

## Tecnología

- Angular 18.2 y TypeScript 5.5
- SCSS y Tailwind CSS
- Lucide Angular para todos los iconos
- Chart.js para los gráficos
- AG Grid para la carga masiva
- SheetJS (`xlsx`) para leer plantillas Excel

## Ejecutar en VS Code

Requisitos: Node.js 20 LTS y npm.

```bash
npm ci
npm start
```

Abre `http://localhost:4200`. En el modo demostración puedes iniciar sesión con
cualquier correo válido y una contraseña de seis caracteres o más.

## Funcionalidades incluidas

- Dashboard moderno con resumen de caja, ingresos, egresos pagados, neto,
  próximos pagos, gráfico diario y últimos movimientos.
- Registro individual en una página independiente.
- Egresos pagados o proyectados; los proyectados no reducen la caja real.
- Carga de XML con lectura de RUC, razón social, fecha, serie, número y monto.
  Los campos adicionales solo aparecen después de procesar el XML.
- Carga masiva desde Excel con validaciones, filtros, búsqueda, selección de
  filas y paginación de 10, 25, 50 o 100 registros.
- Vistas de movimientos, flujo de caja, reportes, categorías y configuración.
- Diseño responsive para escritorio, tablet y móvil.

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel selecciona **Add New → Project** e importa el repositorio.
3. Vercel leerá automáticamente `vercel.json`.
4. Pulsa **Deploy**. No necesitas cambiar el directorio de salida.

Para validar antes de subir:

```bash
npm run build:vercel
```

## Preparación para el backend

Por ahora los servicios usan datos simulados en memoria. Cuando esté disponible
el backend Spring Boot, se reemplazarán esos servicios por `HttpClient` sin
cambiar las páginas.

- URL local: `src/environments/environment.ts`
- URL de producción: `src/environments/environment.production.ts`
- Configuración común: `src/app/core/config/api.config.ts`
- Autenticación simulada: `src/app/core/auth/auth.service.ts`
- Movimientos simulados: `src/app/nucleo/servicios/movimiento.service.ts`
- Registro masivo: `src/app/nucleo/servicios/carga-masiva-movimiento.service.ts`

Antes de desplegar con el backend real, cambia `TU-BACKEND.onrender.com` por la
URL pública correspondiente y configura CORS en Spring Boot para aceptar el
dominio de Vercel.
