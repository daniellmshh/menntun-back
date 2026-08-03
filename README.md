# Menntun Backend

API de Menntun construida con NestJS, Prisma y Supabase PostgreSQL.

## Comandos

```bash
npm install
npm run start:dev
npm run build
npm run test
```

La API se sirve bajo `/api` y las respuestas REST usan `{ data, meta, error }`. Swagger se expone en `/api/docs` en entornos habilitados.

## Reglas esenciales

- Toda consulta de negocio debe respetar el `schoolId` activo.
- Usa Prisma para datos y Supabase Admin sólo del lado del servidor.
- No apliques `prisma db push --accept-data-loss` para resolver drift; revisa primero los cambios ajenos.
- Los módulos viven en `src/modules/`; guardas, filtros e interceptores compartidos en `src/common/`.

Consulta [`../AGENTS.md`](../AGENTS.md) y [`.context/README.md`](../.context/README.md) antes de cambiar contratos, esquema o módulos.

## Alertas de asistencia

Para entregar avisos de entrada, salida y salida anticipada al tutor principal, configura en Railway `RESEND_API_KEY`, `RESEND_FROM`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`. Sin esas variables, la asistencia continúa funcionando y el intento queda registrado como fallido para diagnóstico; nunca se bloquea el registro en portería.
