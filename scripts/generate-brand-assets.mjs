import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const assetsDir = join(root, 'assets');
const brandDir = join(assetsDir, 'brand');
const logoDir = join(assetsDir, 'logo');
const androidResDir = join(root, 'android', 'app', 'src', 'main', 'res');

const iconSource = join(logoDir, 'pineapple-icon-source.png');
const markSource = join(logoDir, 'pineapple-mark-source.png');
const roundSource = join(logoDir, 'pineapple-round-source.png');

const backgroundBlue = '#33A3DF';
const splashLogoTargets = [
  ['drawable-mdpi', 288],
  ['drawable-hdpi', 432],
  ['drawable-xhdpi', 576],
  ['drawable-xxhdpi', 864],
  ['drawable-xxxhdpi', 1152],
];

const monochromeSize = 432;
const backgroundThreshold = 18;

function isNearBlack(red, green, blue) {
  return red <= backgroundThreshold && green <= backgroundThreshold && blue <= backgroundThreshold;
}

async function buildMonochromeIcon() {
  const { data, info } = await sharp(markSource)
    .resize(monochromeSize, monochromeSize)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const background = new Uint8Array(pixelCount);
  const queue = [];

  function maybeQueue(x, y) {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) {
      return;
    }

    const offset = (y * info.width + x) * info.channels;
    const index = y * info.width + x;
    if (background[index]) {
      return;
    }

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];

    if (!isNearBlack(red, green, blue)) {
      return;
    }

    background[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < info.width; x += 1) {
    maybeQueue(x, 0);
    maybeQueue(x, info.height - 1);
  }

  for (let y = 0; y < info.height; y += 1) {
    maybeQueue(0, y);
    maybeQueue(info.width - 1, y);
  }

  while (queue.length) {
    const index = queue.shift();
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    maybeQueue(x + 1, y);
    maybeQueue(x - 1, y);
    maybeQueue(x, y + 1);
    maybeQueue(x, y - 1);
  }

  const output = Buffer.alloc(pixelCount * 4);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * info.channels;
    const outputOffset = index * 4;
    const alpha = data[offset + 3];
    const isForeground = alpha > 0 && !background[index];
    output[outputOffset] = 255;
    output[outputOffset + 1] = 255;
    output[outputOffset + 2] = 255;
    output[outputOffset + 3] = isForeground ? 255 : 0;
  }

  return sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toFile(join(assetsDir, 'android-icon-monochrome.png'));
}

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

  await buildMonochromeIcon();

  await sharp(roundSource).resize(192, 192).png().toFile(join(assetsDir, 'icons', 'pineapple-round-preview.png'));

  await Promise.all(
    splashLogoTargets.map(async ([folder, size]) => {
      const targetDir = join(androidResDir, folder);
      await mkdir(targetDir, { recursive: true });
      await sharp(markSource).resize(size, size).png().toFile(join(targetDir, 'splashscreen_logo.png'));
    }),
  );
}

render().catch((error) => {
  console.error(error);
  process.exit(1);
});
