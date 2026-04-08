# GastoFlow — Control de Gastos Personal

App de escritorio para llevar el control de tus gastos, construida con Electron.

## Características
- Registro de gastos con descripción, monto y categoría
- Estadísticas del mes actual (total + desglose por categoría)
- Filtro por categoría
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

En **Windows**, si `npm install` falla al compilar `better-sqlite3`, instala [Build Tools for Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (carga de trabajo “Desarrollo para el escritorio con C++”) y vuelve a ejecutar `npm install`.

## Categorías disponibles
- 🌮 Comida
- 🍰 Postres
- 🛒 Despensa
- 🚌 Transporte
- 🎬 Entretenimiento
- 💊 Salud
- ⚡ Servicios
- 📚 Capacitación
- 👕 Ropa
- 🐕 Gastos Rufo
- 📦 Otro

## Dónde se guardan los datos
Los datos viven en **SQLite** en la carpeta del proyecto:

`gastos-app/data/expenses.db`

Así puedes reutilizar el mismo archivo que otro sistema de gastos con la misma tabla `expenses` (`date`, `category`, `description`, `amount`, `tip`). El monto mostrado en la app es **amount + tip**. Las categorías del otro sistema (p. ej. `Comidas`, `Rufo` / `Gastos Rufo`; gastos de mascota se unifican con **Gastos Rufo**) se mapean a la interfaz cuando es posible; el resto aparece como “otro”.

## Estructura del proyecto
```
gastos-app/
  main.js          → Proceso principal (Electron + better-sqlite3)
  data/expenses.db → Base SQLite compartible con otros programas
  preload.js       → Puente seguro entre UI y sistema
  index.html       → Interfaz de usuario
  package.json
```
# family_expenses
