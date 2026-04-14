# GastoFlow — Control de Gastos Personal

App de escritorio para llevar el control de tus gastos, construida con Electron.

## Características
- Registro de gastos con descripción, **fecha** (por defecto hoy), monto y categoría
- Selector de **mes** para ver lista y totales de cualquier mes
- Estadísticas del mes elegido (total + desglose por categoría)
- **Exportar a Excel** (.xlsx): mes consultado o historial completo
- Filtro por categoría, por persona (Dafne / Ricardo) y por texto en la descripción
- Agrupación por fecha
- Datos guardados localmente en JSON (no necesita internet ni servidor)
- Diseño oscuro moderno

## Requisitos
- Node.js 18 o superior
- npm

## Instalación y uso

```bash
# 1. Entra a la carpeta
cd gastos-app

# 2. Instala dependencias (solo la primera vez; compila SQLite para Electron)
npm install

# 3. Ejecuta la app
npm start
```

En **Windows**, si `npm install` falla, instala [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) y vuelve a ejecutar `npm install`.

## Categorías disponibles
- 🌮 Comida
- 🍰 Postres
- 🛒 Despensa
- 🚌 Transporte
- 🛡️ Seguro (p. ej. auto)
- 🎬 Entretenimiento
- 💊 Salud
- ⚡ Servicios
- 📚 Capacitación
- 👕 Ropa
- 🐕 Gastos Rufo
- 📦 Otro

## Dónde se guardan los datos
Los datos viven en **Supabase (PostgreSQL)**.

- Configuración: `SUPABASE_URL` y `SUPABASE_ANON_KEY` (ver `.env.example`), o `supabase-config.json` en `userData` para la app instalada.
- Esquema: `supabase/schema.sql`

## Estructura del proyecto
```
gastos-app/
  main.js          → Proceso principal (Electron + Supabase)
  preload.js       → Puente seguro entre UI y sistema
  index.html       → Interfaz de usuario
  package.json
  supabase/        → Esquema SQL
```
# family_expenses


# Dist for mac
```
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist
```