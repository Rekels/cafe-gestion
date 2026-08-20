# Arquitectura V2: Flujo Centralizado de Inventario (Ledger Pattern)

## 1. El Problema Actual (V1)
Actualmente, el sistema gestiona el stock mediante **mutación directa** de la tabla `Lotes` (específicamente actualizando los campos `stock_real` y `peso_kg`). 

### Inconvenientes detectados:
* **Pérdida de Trazabilidad:** Al sobrescribir el peso, perdemos el historial exacto de cómo ese contenedor llegó a ese peso actual.
* **Inconsistencias por Procesos Aislados:** Cada módulo (Tueste, Selección, Consolidación/Mezcla, Ajuste Manual) contiene su propia lógica para sumar o restar en la base de datos. Si uno de estos procesos falla o se ejecuta a medias (por ejemplo, un tueste completado sin peso de salida), se descuadra todo el inventario.
* **Confusión de Conceptos:** La ambigüedad entre "Peso Inicial del Contenedor" vs "Stock Restante" causa que los reportes globales (vistas SQL) muestren datos desactualizados si no son programados con lógica compleja (ej. uso excesivo de `COALESCE`).

---

## 2. La Solución V2 (Event Sourcing / Libro Mayor)
La solución definitiva es adoptar un patrón de **Ledger (Libro Mayor)** basado en el concepto contable de partida doble y eventos (Event Sourcing).

### El Concepto Central: Inmutabilidad
1. **La tabla `Lotes` nunca muta sus pesos.** El campo `peso_kg` en la tabla principal representa estrictamente el peso inicial con el que el contenedor entró al almacén.
2. **El inventario se calcula, no se almacena de forma estática.** El stock actual es la proyección matemática (suma y resta) de todos los movimientos registrados para ese lote.
3. **Cero vacíos lógicos.** Si hay una diferencia de kilos, tiene que haber un "Movimiento" que lo explique (una merma, un tueste, un traslado).

---

## 3. Modelo de Datos V2 Propuesto

### Tabla: `MovimientosStock`
Esta será la tabla más crítica del sistema. Absolutamente todas las entradas y salidas de café deben pasar por aquí.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | INTEGER | Clave primaria |
| `lote_id` | INTEGER | Lote afectado (Foránea a Lotes) |
| `fecha_hora` | DATETIME| Cuándo ocurrió el movimiento |
| `tipo_movimiento`| TEXT | `ENTRADA` o `SALIDA` |
| `proceso_origen` | TEXT | `TUESTE`, `TRILLADO`, `MEZCLA`, `AJUSTE_MANUAL`, `MERMA`, `VENTA` |
| `referencia_id` | INTEGER | ID de la tabla de origen (ej. ID del Tueste o de la Sesión) para auditoría |
| `estado_cafe` | TEXT | `ORO VERDE`, `PERGAMINO`, `TOSTADO`, etc. |
| `cantidad_kg` | REAL | Kilogramos exactos movidos |
| `usuario_id` | INTEGER | Quién realizó el movimiento (Opcional) |
| `notas` | TEXT | Justificación (obligatorio en Ajustes y Mermas) |

### Vista SQL: `Vista_StockActual`
El stock de la aplicación (la tabla de la UI) leerá de una vista estructurada de la siguiente manera:
```sql
CREATE VIEW Vista_StockActual AS
SELECT 
    l.id,
    l.n_lote,
    l.contenedor,
    l.peso_kg AS peso_inicial,
    (
        SELECT COALESCE(SUM(cantidad_kg), 0) FROM MovimientosStock WHERE lote_id = l.id AND tipo_movimiento = 'ENTRADA'
    ) - 
    (
        SELECT COALESCE(SUM(cantidad_kg), 0) FROM MovimientosStock WHERE lote_id = l.id AND tipo_movimiento = 'SALIDA'
    ) AS stock_real
FROM Lotes l;
```

---

## 4. Ejemplos de Flujo de Trabajo (Workflows)

### A. Ciclo de Tueste Completo
Cuando el usuario finaliza una Sesión de Tueste, en lugar de hacer `UPDATE Lotes SET stock_real = X`, el sistema hace lo siguiente:
1. **Validación:** Verifica que todos los tuestes planificados tengan Peso Verde (GC) y Peso Tostado (RC).
2. **Generación de Movimientos:**
   - **Movimiento 1:** `SALIDA` de 10 kg de `ORO VERDE` (proceso: `TUESTE`, referencia: Tueste_ID_123).
   - **Movimiento 2:** `ENTRADA` de 8.5 kg de `TOSTADO` (proceso: `TUESTE`, referencia: Tueste_ID_123).
   - **Movimiento 3 (Automático):** `SALIDA` por `MERMA` de 1.5 kg (calculado como GC - RC).

### B. Consolidación de Lotes (Mezclas)
Si se mezclan el `LOTE-A` (5kg) y el `LOTE-B` (3kg) para crear el `LOTE-C` (8kg):
1. **Movimiento 1:** `SALIDA` de 5 kg del `LOTE-A`.
2. **Movimiento 2:** `SALIDA` de 3 kg del `LOTE-B`.
3. **Creación:** Se crea en la BD el `LOTE-C` con peso inicial 8kg.
4. **Movimiento 3:** `ENTRADA` de 8 kg al `LOTE-C`.

### C. Ajuste Manual de Inventario (Inventariado Físico)
Si el sistema dice que hay 20kg pero la balanza dice que hay 19.5kg:
1. El usuario realiza un Ajuste.
2. **Movimiento:** `SALIDA` de 0.5 kg (proceso: `AJUSTE_MANUAL`, notas: "Descuadre por pérdida de humedad en almacén").

---

## 5. Beneficios Estratégicos
* **Verdad Absoluta:** Es imposible que la vista global no coincida con el detalle del contenedor.
* **Auditoría Transparente:** Podrás ver una línea de tiempo exacta por contenedor: *"Entraron 30kg, se tostaron 10kg el martes, se perdieron 0.5kg por humedad el miércoles..."*
* **Escalabilidad:** Si mañana agregas "Preparación de Bebidas" o "Venta Minorista" como nuevos módulos de la app, solo tienes que emitir eventos de `SALIDA` hacia este único Ledger. No necesitas tocar la lógica central del inventario nunca más.
