import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const assetsDir = join(root, 'assets');
const brandDir = join(assetsDir, 'brand');

const appIconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="240" fill="#F7E7CE"/>
  <circle cx="512" cy="512" r="360" fill="url(#sandGlow)"/>
  <path d="M512 112C562 154 592 206 598 268C648 250 700 260 742 298C706 310 676 332 654 364C724 378 782 420 818 482C768 478 724 488 688 514C712 556 724 600 720 648C672 628 626 620 584 626C576 678 548 742 512 780C476 742 448 678 440 626C398 620 352 628 304 648C300 600 312 556 336 514C300 488 256 478 206 482C242 420 300 378 370 364C348 332 318 310 282 298C324 260 376 250 426 268C432 206 462 154 512 112Z" fill="url(#leafGradient)"/>
  <path d="M512 258C660 258 780 378 780 532C780 688 662 820 512 820C362 820 244 688 244 532C244 378 364 258 512 258Z" fill="#F4B400"/>
  <path d="M512 280C648 280 758 390 758 532C758 674 650 798 512 798C374 798 266 674 266 532C266 390 376 280 512 280Z" fill="url(#bodyGradient)"/>
  <path d="M368 394L658 684" stroke="#D99412" stroke-width="22" stroke-linecap="round" opacity="0.8"/>
  <path d="M320 500L704 756" stroke="#D99412" stroke-width="22" stroke-linecap="round" opacity="0.65"/>
  <path d="M676 394L386 684" stroke="#D99412" stroke-width="22" stroke-linecap="round" opacity="0.8"/>
  <path d="M724 500L340 756" stroke="#D99412" stroke-width="22" stroke-linecap="round" opacity="0.65"/>
  <ellipse cx="396" cy="420" rx="84" ry="112" fill="rgba(255,255,255,0.28)"/>
  <path d="M312 606C364 644 432 666 512 666C592 666 660 644 712 606" stroke="#B76728" stroke-width="16" stroke-linecap="round" opacity="0.7"/>
  <defs>
    <linearGradient id="leafGradient" x1="512" y1="112" x2="512" y2="780" gradientUnits="userSpaceOnUse">
      <stop stop-color="#75BA63"/>
      <stop offset="1" stop-color="#4E9F6D"/>
    </linearGradient>
    <linearGradient id="bodyGradient" x1="512" y1="280" x2="512" y2="798" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFD76A"/>
      <stop offset="1" stop-color="#F4B400"/>
    </linearGradient>
    <radialGradient id="sandGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(512 352) rotate(90) scale(520)">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F7E7CE"/>
    </radialGradient>
  </defs>
</svg>
`.trim();

const splashSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#F7E7CE"/>
  <g transform="translate(112, 80)">
    <path d="M400 0C450 42 480 94 486 156C536 138 588 148 630 186C594 198 564 220 542 252C612 266 670 308 706 370C656 366 612 376 576 402C600 444 612 488 608 536C560 516 514 508 472 514C464 566 436 630 400 668C364 630 336 566 328 514C286 508 240 516 192 536C188 488 200 444 224 402C188 376 144 366 94 370C130 308 188 266 258 252C236 220 206 198 170 186C212 148 264 138 314 156C320 94 350 42 400 0Z" fill="#4E9F6D"/>
    <path d="M400 146C548 146 668 266 668 420C668 576 550 708 400 708C250 708 132 576 132 420C132 266 252 146 400 146Z" fill="#F4B400"/>
    <path d="M400 168C536 168 646 278 646 420C646 562 538 686 400 686C262 686 154 562 154 420C154 278 264 168 400 168Z" fill="#F6C548"/>
    <path d="M256 282L546 572" stroke="#D99412" stroke-width="20" stroke-linecap="round" opacity="0.75"/>
    <path d="M564 282L274 572" stroke="#D99412" stroke-width="20" stroke-linecap="round" opacity="0.75"/>
    <ellipse cx="286" cy="306" rx="80" ry="104" fill="rgba(255,255,255,0.24)"/>
  </g>
</svg>
`.trim();

const monoSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="240" fill="white"/>
  <path d="M512 120C566 162 598 216 606 282C660 262 714 272 758 312C718 324 684 348 660 384C734 398 794 442 832 506C778 502 730 514 690 542C714 588 724 636 720 690C668 668 620 660 576 666C568 724 542 788 512 828C482 788 456 724 448 666C404 660 356 668 304 690C300 636 310 588 334 542C294 514 246 502 192 506C230 442 290 398 364 384C340 348 306 324 266 312C310 272 364 262 418 282C426 216 458 162 512 120Z" fill="black"/>
  <path d="M512 264C662 264 784 386 784 540C784 696 664 824 512 824C360 824 240 696 240 540C240 386 362 264 512 264Z" fill="black"/>
</svg>
`.trim();

async function render() {
  await mkdir(brandDir, { recursive: true });
  await writeFile(join(brandDir, 'pineapple-app-icon.svg'), appIconSvg);
  await writeFile(join(brandDir, 'pineapple-splash-mark.svg'), splashSvg);
  await writeFile(join(brandDir, 'pineapple-monochrome.svg'), monoSvg);

  await sharp(Buffer.from(appIconSvg)).png().toFile(join(assetsDir, 'icon.png'));
  await sharp(Buffer.from(appIconSvg)).resize(512, 512).png().toFile(join(assetsDir, 'android-icon-foreground.png'));
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: '#F7E7CE',
    },
  }).png().toFile(join(assetsDir, 'android-icon-background.png'));
  await sharp(Buffer.from(monoSvg)).png().toFile(join(assetsDir, 'android-icon-monochrome.png'));
  await sharp(Buffer.from(splashSvg)).png().toFile(join(assetsDir, 'splash-icon.png'));
  await sharp(Buffer.from(appIconSvg)).resize(256, 256).png().toFile(join(assetsDir, 'favicon.png'));
}

render().catch((error) => {
  console.error(error);
  process.exit(1);
});
