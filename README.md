# LavaSuite Desktop · MVP funcional por fases

Aplicación de escritorio para lavandería y sastrería construida con Electron, React, TypeScript, Node.js y MySQL, diseñada como single-tenant por instalación.

## Estructura base

```text
src/
  backend/
    db/
      connection.ts
      schema.ts
      migrator.ts
      migrations/
    modules/
      auth/
      cash/
      clients/
      deliveries/
      invoices/
      orders/
      payments/
      settings/
  main/
    ipc/
    services/
    main.ts
    preload.ts
  renderer/
    modules/
      auth/
      cash/
      clients/
      dashboard/
      deliveries/
      invoices/
      orders/
      payments/
      shared/
    hooks/
    services/
    ui/
      components/
      layouts/
    utils/
    styles/
  shared/
    types.ts
```

## Estado actual del MVP

### Fase 1 completada
- configuración MySQL por instalación
- login funcional con auditoría
- layout comercial base
- dashboard inicial
- CRUD de clientes

### Fase 2 iniciada
- órdenes con múltiples ítems
- detalle completo de orden
- registrar pago
- generar factura
- caja activa
- entregar orden

## Flujo operativo disponible

Dashboard → Nueva orden → Detalle de orden → Registrar pago → Generar factura → Entregar orden.

## Cómo correr

1. Instala dependencias.
2. Ejecuta `npm run dev`.
3. Configura la conexión MySQL en la primera pantalla.
4. Ingresa con `admin / admin`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
