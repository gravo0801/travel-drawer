// Paints the default background pictures (drawn mountains and clouds) used until real photos are set.
import sharp from "sharp";
import { RANGE_TONES, planRange, paintRows } from "./range.mjs";
const jobs = [
  ["hero", "golden", 2400, 1350, 7],
  ["archive", "haze", 2400, 1600, 11],
  ["footer", "night", 2400, 1350, 3],
  ["hero-light", "lake", 2400, 1350, 21],
  ["archive-light", "alpenglow", 2400, 1600, 5],
  ["footer-light", "dusk", 2400, 1350, 9],
];
for (const [name, tone, W, H, seed] of jobs) {
  const t0 = Date.now();
  const P = planRange(W, H, RANGE_TONES[tone], seed);
  const buf = new Uint8ClampedArray(W * H * 4);
  paintRows(P, buf, 0, H);
  await sharp(Buffer.from(buf.buffer), { raw: { width: W, height: H, channels: 4 } }).jpeg({ quality: 82, mozjpeg: true }).toFile(`public/media/site/${name}.jpg`);
  console.log(name, Date.now() - t0, "ms");
}
