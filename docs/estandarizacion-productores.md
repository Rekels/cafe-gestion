# Estandarización de Nombres de Productores

## Resumen
Durante una sesión de corrección de datos para un lote específico (Jaci - Obata de Isaías Lagos, que figuraba erróneamente como Alfonso Yaranga), se detectó que los nombres de los productores en la tabla `Lotes` no coincidían exactamente con los del catálogo en la tabla `Productores`.

## Acciones Realizadas
1. **Corrección de Lote:** Se actualizó el lote ID 147 para corregir el productor a `ISAIAS LAGOS`.
2. **Estandarización a Mayúsculas:** Se tomó la decisión de que la tabla `Lotes` debe reflejar exactamente los nombres en MAYÚSCULAS tal como existen en la tabla `Productores`.
3. **Migración de Nuevos Productores:** Se identificaron productores que existían en los `Lotes` (históricos y activos) pero que no estaban registrados en el catálogo principal de `Productores`. Se añadieron automáticamente en formato mayúsculas.
4. **Correcciones Manuales:**
   - `MAXIMO` se actualizó a `MAXIMO CASTILLO BORDA`.
   - `Teodosio` se homologó correctamente a `TEODOCIO CCOYCCA SALAZAR`.
5. Se actualizó la totalidad de registros en la tabla `Lotes` para referenciar a su correspondiente nombre estandarizado en mayúsculas en la tabla `Productores`.

## Script Utilizado
El proceso fue realizado usando un script en Python (`fix_data_productores.py`) que aplicó las mutaciones a la base de datos `cafe_gestion.db`.
