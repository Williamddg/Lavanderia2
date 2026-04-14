const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const sourceDir = path.join(process.cwd(), 'src', 'backend', 'db', 'migrations');
  const targetDir = path.join(process.cwd(), 'dist-electron', 'backend', 'db', 'migrations');

  await fs.mkdir(targetDir, { recursive: true });

  const files = await fs.readdir(sourceDir);

  await Promise.all(
    files
      .filter((file) => file.endsWith('.sql'))
      .map((file) =>
        fs.copyFile(path.join(sourceDir, file), path.join(targetDir, file))
      )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
