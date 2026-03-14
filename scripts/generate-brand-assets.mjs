import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const assetsDir = join(root, 'assets');
const brandDir = join(assetsDir, 'brand');
const logoDir = join(assetsDir, 'logo');

const iconSource = join(logoDir, 'pineapple-icon-source.png');
const markSource = join(logoDir, 'pineapple-mark-source.png');
const roundSource = join(logoDir, 'pineapple-round-source.png');

const backgroundBlue = '#33A3DF';

async function render() {
  await mkdir(brandDir, { recursive: true });

  // Keep lightweight source-of-truth notes in brand/ for design handoff.
  await writeFile(
    join(brandDir, 'pineapple-app-icon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><desc>Pineapple app icon is generated from assets/logo/pineapple-icon-source.png</desc></svg>\n'
  );
  await writeFile(
    join(brandDir, 'pineapple-splash-mark.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432"><desc>Pineapple splash mark is generated from assets/logo/pineapple-mark-source.png</desc></svg>\n'
  );
  await writeFile(
    join(brandDir, 'pineapple-monochrome.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432"><desc>Pineapple monochrome icon is generated from the alpha channel of assets/logo/pineapple-mark-source.png</desc></svg>\n'
  );

  await sharp(iconSource).resize(1024, 1024).png().toFile(join(assetsDir, 'icon.png'));
  await sharp(iconSource).resize(256, 256).png().toFile(join(assetsDir, 'favicon.png'));
  await sharp(markSource).resize(1024, 1024).png().toFile(join(assetsDir, 'splash-icon.png'));
  await sharp(markSource).resize(432, 432).png().toFile(join(assetsDir, 'android-icon-foreground.png'));

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: backgroundBlue,
    },
  })
    .png()
    .toFile(join(assetsDir, 'android-icon-background.png'));

  await sharp(markSource)
    .ensureAlpha()
    .extractChannel('alpha')
    .threshold()
    .resize(432, 432)
    .png()
    .toFile(join(assetsDir, 'android-icon-monochrome.png'));

  await sharp(roundSource).resize(192, 192).png().toFile(join(assetsDir, 'icons', 'pineapple-round-preview.png'));
}

render().catch((error) => {
  console.error(error);
  process.exit(1);
});
