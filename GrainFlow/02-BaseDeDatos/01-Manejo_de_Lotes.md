# Manejo de Lotes e Inventario (Propuesta de Refactorización)

Actualmente en el sistema `cafe_gestion`, existe un acoplamiento donde los "Pesos" y el "Inventario" residen como columnas dentro de la tabla de **Servicios** (Órdenes de Trabajo). Esto impide una trazabilidad avanzada (ej. mermas, mezclas o "blends" de lotes, divisiones complejas).

## La Solución: Ledger Orientado a Eventos

Separamos estrictamente la **Orden de Trabajo (Servicio)** del **Inventario Físico (Lote y Transacciones)**.

### 1. Entidad: `Lotes` (Inventario Físico)
Un `Lote` no representa solo el "ingreso" del café, sino **el café en un estado específico**.
* **Estado**: `pergamino`, `verde`, `tostado`, `molido`.
* Cuando un café se procesa (ej. se tuesta), **no** se muta el lote original a tostado. Se crea un **nuevo Lote** de estado `tostado` que tiene como padre (`parent_lote_id`) al lote verde original.
* Esto crea un **Árbol de Trazabilidad Genética**. Puedes saber exactamente de qué saco de pergamino salió una bolsa de café molido.

### 2. Entidad: `Transacciones_Lote` (Movimientos / Ledger)
Para saber cuánto café hay en un Lote, **no guardaremos un campo estático `peso_actual` que se actualice manual**. Leeremos el total de sus transacciones.
* Un "ingreso inicial" crea una transacción de tipo `ingreso` (+100kg).
* Un "proceso de trillado" crea una transacción de tipo `consumo_trillado` (-100kg) sobre el Lote Pergamino, y una de tipo `resultado_trillado` (+80kg) sobre el nuevo Lote Verde.
* La diferencia (20kg) se registra como una transacción tipo `merma_trillado` (-20kg) o simplemente se deduce de la diferencia en un reporte.

**Estructura Propuesta de la Tabla `Transacciones_Lote`**:
- `id` (PK)
- `lote_id` (FK a Lotes)
- `tipo_movimiento` (ingreso, consumo_trillado, resultado_trillado, merma, ajuste)
- `cantidad_kg` (Decimal: Positivo o Negativo)
- `servicio_id` (Opcional, FK a la Orden de Trabajo que justifica el movimiento)
- `fecha` (Fecha de la transacción)

### 3. Entidad: `Servicios` (Orden de Trabajo)
La tabla `Servicios` volverá a ser simplemente el documento contractual/financiero. 
- Contendrá si se contrató Trillado, Tueste, y a qué precio.
- Estará ligada a las `Transacciones_Lote` a través del `servicio_id`.
- Se eliminarían columnas obsoletas que llevaban el control de stock de manera frágil (como `pc`, `gc`, `rc`, `total_tueste_real`).

## Migración de Datos (Plan Futuro)
Para implementar este diseño sin perder los datos de las OTs y Proformas actuales, se deberá escribir un script en Python/Node que:
1. Lea todos los `Servicios` actuales.
2. Cree los `Lotes` correspondientes (Pergamino, Verde, Tostado).
3. Genere las `Transacciones` simuladas de entrada y salida basadas en los valores `pc`, `gc`, y `peso_tostado` de esos servicios.
