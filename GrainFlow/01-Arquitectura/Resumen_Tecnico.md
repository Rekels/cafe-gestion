# Arquitectura General: Café Gestión

## Stack Tecnológico
- **Frontend / Backend**: Next.js 16 (App Router) usando React Server Components.
- **Base de Datos**: SQLite (mediante la librería `sqlite` nativa en Node.js, `cafe_gestion.db`).
- **Estilos**: Tailwind CSS.
- **Iconografía**: Héroe / Emojis (temporalmente) o SVG nativos.

## Principios de Diseño
1. **Server Actions First**: Todas las mutaciones de datos se hacen vía *Server Actions* en `actions.ts`.
2. **Client Components Mínimos**: Los componentes interactivos (modales, formularios) tienen `"use client"`. El renderizado principal (listas, tablas) es idealmente en el servidor (`page.tsx`).
3. **No ORM pesado**: Realizamos las consultas directamente a SQLite usando SQL nativo para optimizar el rendimiento y simplicidad.

## Estructura de Módulos (Actual)
- **Proformas**: Módulo de facturación/cotizaciones. Convierte proformas en Servicios.
- **Servicios**: Representan la Orden de Trabajo (OT). Qué proceso se contrata (Trillado, Tueste, Selección, Molienda).
- **Tuestes**: Módulo independiente para controlar las curvas o "batches" de tueste y sesiones por máquina.
- **Equipos**: Catálogo de máquinas del taller (Trilladoras, Tostadoras, etc.).
- **Lotes (Stock)**: *(En Refactorización)* Inventario físico de café del taller.
