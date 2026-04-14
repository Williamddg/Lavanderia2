# LavaSuite Desktop

Aplicación de escritorio para lavandería y sastrería construida con Electron, React, TypeScript y MySQL.

## Arquitectura

```text
src/
  backend/    # dominio, base de datos y servicios de negocio
  main/       # proceso principal de Electron, preload e IPC
  renderer/   # interfaz React
  shared/     # tipos compartidos
```

## Requisitos

- Node.js 22
- npm 10+
- Docker Desktop para desarrollo recomendado
- En macOS: Xcode Command Line Tools

## Desarrollo Rápido En macOS Intel

1. Instala dependencias:

```bash
npm install
```

2. Levanta MySQL con Docker:

```bash
docker compose up -d
```

3. Inicia la app:

```bash
npm run dev
```

4. En la pantalla inicial usa:

- Host: `127.0.0.1`
- Puerto: `3306`
- Usuario: `lavanderia`
- Contraseña: `lavanderia_dev`
- Base de datos: `lavanderia`

5. Ingresa con:

- Usuario: `admin`
- Contraseña: `admin`

La primera autenticación actualiza el hash del usuario legado automáticamente.

## Impresión y Backup

- La integración con impresoras/cajón es opcional y puede requerir rebuild del módulo nativo:

```bash
npx electron-rebuild -f -w @alexssmusica/node-printer
```

- Para backups SQL en macOS/Linux instala `mysql-client` para disponer de `mysqldump` en tu PATH.
- Si quieres usar Google Drive, define `GOOGLE_OAUTH_PATH` o copia `google-oauth.json` al directorio `userData` de la app. Ya no se empaqueta dentro del instalador.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run dist:win`
- `npm run dist:mac`
- `npm run dist:linux`

## Distribución

La app se empaqueta de forma nativa:

- Windows: NSIS
- macOS: DMG y ZIP
- Linux: AppImage y DEB
