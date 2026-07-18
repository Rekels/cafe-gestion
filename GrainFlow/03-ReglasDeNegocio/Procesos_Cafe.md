 # Reglas de Negocio: Procesos de Café

## Formato de Fechas
- **Estricto**: Todo el sistema debe renderizar las fechas en formato Latinoamericano: **DD/MM/AA**.
- Internamente en la base de datos se recomienda usar estándar ISO (YYYY-MM-DD o ISO8601) para permitir ordenamiento y consistencia temporal.

## Tipos de Proceso y Códigos de Color (Etiquetas Visuales)
Para diferenciar rápidamente el tipo de proceso del café en el sistema, siempre se deben aplicar estas reglas de estilo (UI Badges):
- **Naturales**: Color Morado (`text-purple-300`, `border-purple-800/40`, `bg-purple-950/40`).
- **Honey**: Color Amarillo (`text-yellow-300`, `border-yellow-800/40`, `bg-yellow-950/40`).
- **Lavados**: Color Verde (`text-emerald-300`, `border-emerald-800/40`, `bg-emerald-950/40`).
- **Otros**: Gris neutral por defecto.

## Nomenclaturas y Flujo Operativo
- **Servicios/Proformas**: Un servicio es lo que se cobra al cliente. La Proforma puede amparar uno o más servicios.
- **Batches de Tueste**: Un lote verde (`gc` - Green Coffee) de X kilos se puede dividir en N baches para ser tostado de manera independiente en la máquina tostadora.
- **Unificación de Clientes**: Se debe evitar crear duplicados del mismo cliente con nombres parecidos (ej. "Luis" vs "Inspira Café"). Si ocurre, deben unificarse en la base de datos para no quebrar el historial.
