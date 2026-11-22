// Renders demo.html to docs/assets/demo.mp4, frame by frame, with Chrome and ffmpeg.
//   npm i --prefix /tmp/noticely-video puppeteer-core@23
//   NODE_PATH=/tmp/noticely-video/node_modules node docs/video/render.cjs [--stills 9.5,17,30]
// --stills writes PNGs of those seconds next to the video instead, to check a frame.
const { spawn } = require('node:child_process');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const FPS = 30;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = path.join(__dirname, '../assets/demo.mp4');
const stills = process.argv[process.argv.indexOf('--stills') + 1];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('file://' + path.join(__dirname, 'demo.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const stage = await page.$('#stage');

  if (process.argv.includes('--stills')) {
    for (const t of stills.split(',')) {
      await page.evaluate(t => render(t), Number(t));
      await stage.screenshot({ path: path.join(__dirname, `../assets/still-${t}.png`) });
    }
    return browser.close();
  }

  const duration = await page.evaluate(() => DURATION);
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < duration * FPS; f++) {
    await page.evaluate(t => render(t), f / FPS);
    const frame = await stage.screenshot({ type: 'png' });
    if (!ffmpeg.stdin.write(frame)) await new Promise(r => ffmpeg.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`${f / FPS}s`);
  }
  ffmpeg.stdin.end();
  await new Promise(r => ffmpeg.on('close', r));
  await browser.close();
  console.log(out);
})();
