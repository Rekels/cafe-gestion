# Arquitectura de Trazabilidad de Lotes y Mezclas (Blends)

## Resumen Ejecutivo
Se ha definido el modelo arquitectónico para manejar el ciclo de vida del café (maquila/tueste) y la creación de mezclas (blends) a partir de múltiples lotes de origen. La decisión prioriza la **inmutabilidad** y la **trazabilidad estricta** utilizando una tabla relacional.

## Decisiones de Diseño

### 1. Inmutabilidad de los Lotes (Tueste de un solo lote)
Cuando un lote de café verde (ej. `LOTE-147`) pasa por un proceso de tueste total o parcial (maquila):
- **No se muta** el `estado_actual` del lote original de "Oro Verde" a "Tostado".
- Se **crea un nuevo lote** (ej. `LOTE-147-T`) en estado "Tostado".
- El nuevo lote registra `lote_origen_id = 147`.
- El lote original `LOTE-147` simplemente registra una **salida de stock verde** en la tabla `MovimientosStock` por la cantidad utilizada. De este modo, queda un remanente en verde (si fue un tueste parcial) o queda en 0kg, pero siempre manteniendo su integridad histórica y su estado.

### 2. Consolidación vs Blend y Trazabilidad (Lotes_Origenes)
Ya sea que juntemos dos lotes con idénticas características (Consolidación) o diferentes (Blend), a nivel de base de datos el proceso es el mismo:
- Se requiere una nueva tabla relacional estricta llamada `Lotes_Origenes` (antes referida como Lotes_Mezclas).
- **Lote Destino:** Se genera automáticamente un nuevo lote (ej. `LOTE-148-T` si fue a tueste directo, o un nuevo código de lote verde consolidado).
- **Relaciones (Lotes_Origenes):** Se insertan N registros apuntando al nuevo `lote_destino_id` y a los respectivos `lote_origen_id`, junto con la cantidad exacta (kg) extraída de cada uno.
- El stock de cada lote origen es descontado de forma individual y proporcional a su aporte.

### 3. Identidad Automática del Lote Resultante (Metadatos)
Al crear un lote a partir de múltiples orígenes, el sistema definirá sus metadatos automáticamente analizando los lotes padres:
- **Consolidación (Mismas características):** Si todos los lotes origen tienen idéntica variedad, productor y proceso, el nuevo lote hereda directamente estos datos.
- **Blend (Diferentes características):** 
  - **Productor:** Se deben detallar todos los productores involucrados concatenando sus nombres (ej. `ISAIAS LAGOS, ABEL VILCAS`). Esto asegura visibilidad de la trazabilidad en primer plano.
  - **Variedad/Proceso:** Si difieren, se catalogarán como `Blend` (o concatenados según la vista).

## Próximos Pasos (Implementación)
1. **Crear migración SQLite:** Añadir la tabla `Lotes_Mezclas` con `lote_origen_id`, `lote_destino_id` y `cantidad_kg`.
2. **Actualizar Backend (actions.ts):** Modificar la lógica de "Nueva Orden de Tueste" para soportar múltiples inputs de lotes cuando se marca la opción de Blend.
3. **Actualizar UI (AddOrderModal):** Permitir al usuario agregar más de un lote de la lista y especificar el peso individual extraído de cada uno.
