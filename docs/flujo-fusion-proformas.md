# Flujo y Estandarización de Fusión de Proformas

## Contexto y Problema
Durante el análisis de proformas históricas (`PR-2026-0010`, `PR-2026-0011` y `PROF-2026-0011`), se identificaron discrepancias en el comportamiento del sistema al fusionar o juntar proformas:
1. **Inconsistencia de Prefijo**: La creación individual utilizaba el prefijo `PR-YYYY-XXXX` basado en el ID autoincremental real, mientras que la fusión (`mergeProformas`) empleaba un cálculo con `COUNT(*) + 1` y prefijo `PROF-YYYY-XXXX`. Esto provocaba desajustes entre los números de proforma y los IDs de la base de datos, así como potenciales colisiones en la numeración al haberse eliminado filas previamente.
2. **Ruido visual en la lista general**: Al fusionarse dos proformas, las originales (que pasan al estado `Fusionada`) permanecían visibles por defecto junto a las proformas activas en la tabla general ("Todos los Estados").
3. **Mayúsculas/Minúsculas y Estado Inicial**: Se insertaba como `borrador` en minúscula al fusionar, frente a `Borrador` en el resto del sistema, lo cual generaba inconsistencias en la evaluación de clases y estilos.

## Solución Implementada
1. **Estandarización de Numeración y Estado ([`actions.ts`](../web-app/src/app/proformas/actions.ts))**:
   - La función `mergeProformas` ahora genera las nuevas proformas usando exclusivamente el prefijo oficial `PR-YYYY-XXXX`, asociadas al ID autoincremental (`result.lastID`).
   - La nueva proforma consolidada se inicializa con estado `Borrador` (con inicial mayúscula), permitiendo al operador editar saldos o conceptos antes de proceder con la emisión oficial.

2. **Ocultamiento Inteligente en Vista General ([`ProformasClient.tsx`](../web-app/src/app/proformas/ProformasClient.tsx))**:
   - En la lista de proformas, el filtro por defecto ("Todos los Estados") excluye explícitamente aquellas con estado `Fusionada`.
   - Para consultar el historial de proformas consolidadas o fusionadas en el pasado, el usuario debe seleccionar específicamente el filtro "Fusionada" en el menú desplegable.
   - El cálculo de estilos (`getStatusPillClass`) se ha flexibilizado mediante `.toLowerCase()` para prevenir desajustes visuales ante diferencias de capitalización.
