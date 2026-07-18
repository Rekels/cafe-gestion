# Reglas y Contexto del Proyecto: Café Gestión

## Descripción
Sistema local de administración para una cafetería y tostaduría. El sistema permite gestionar inventario, tostados, entradas/salidas y generar reportes. Aún está en fase de iteración y pruebas locales, por lo que no está listo para producción (Cloudflare/Vercel).

## Estructura
- Raíz: Contiene scripts `.py` para limpiar y migrar datos desde archivos CSV heredados hacia la base de datos local SQLite.
- `web-app/`: Contiene la aplicación web principal.
- `GrainFlow/`: Contiene documentación técnica estructurada sobre la arquitectura, base de datos y reglas de negocio.

## Stack Tecnológico (App Web)
- **Framework:** Next.js 16 (Prestar especial atención a las convenciones recientes del App Router).
- **Lenguaje:** TypeScript estricto.
- **Estilos:** Tailwind CSS v4.
- **Base de Datos:** SQLite local (accedida mediante los paquetes de npm `sqlite` y `sqlite3`).
- **Librerías de utilidades:** `jspdf` y `html2canvas` (aparentemente para generación de recibos o reportes en PDF).

## Directivas para el Agente (Antigravity)
1. Antes de realizar cambios profundos en Next.js 16, si tienes dudas sobre APIs nuevas, revisa la documentación local en `node_modules/next/dist/docs/`.
2. Al trabajar en la interfaz de usuario, asegúrate de mantener la armonía de los submódulos actuales.
3. No hacer configuraciones de despliegue en la nube por ahora; el foco está en el producto y su funcionamiento en `localhost`.
