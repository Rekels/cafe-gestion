# Reglas de UI/UX y Estilos Visuales

## Principio Principal
- **Mobile-first**: La interfaz se usa fuertemente desde dispositivos móviles y tablets (ej. por operarios junto a la tostadora). Todos los modales y tablas deben tener `overflow-x-auto` o apilarse correctamente en pantallas pequeñas.

## Paleta de Colores Base
El tema principal está inspirado en el café, utilizando una estética oscura de alto contraste (*Dark Mode*):
- **Fondo General**: `#0d0906` (Casi negro / marrón muy oscuro).
- **Fondo de Tarjetas/Modales**: `#1a120b` (Marrón oscuro) con opacidades (ej. `bg-[#1a120b]/60`).
- **Acentos (Dorados/Café claro)**: `#c2a077`. Usado en textos destacados, botones principales, bordes activos.
- **Bordes**: Blancos sutiles (`border-white/5` o `border-white/10`).

## Componentes y Sensación Visual (Glassmorphism)
- Los modales y contenedores principales deben usar propiedades de desenfoque (*blur*) como `backdrop-blur-xl`.
- Las esquinas suelen ser muy redondeadas (`rounded-2xl` o `rounded-3xl`).
- Las sombras deben ser profundas para separar capas sobre el fondo oscuro (`shadow-2xl`, `shadow-black/50`).

## Impresión (Vistas Print)
- Todo lo que lleva clase `print:` debe ignorar el tema oscuro e invertir a blanco/negro clásico (`print:text-black`, `print:bg-transparent`).
- En Proformas, las tipografías deben ser pequeñas (ej. `text-xs` o `text-[10px]`) para asegurar que todo el cuadro de detalle quepa en 1 sola página (A4). No desaprovechar espacio vertical.
