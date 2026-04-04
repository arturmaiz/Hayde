// Generates icon-512.png, icon-192.png, icon-180.png from icon-gen.html
// Run: node gen-icons.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  // Render at 512×512
  await page.setViewportSize({ width: 512, height: 512 });
  await page.goto('file://' + path.resolve(__dirname, 'icon-gen.html'));
  await page.waitForTimeout(200);

  // 512×512
  await page.screenshot({ path: 'icon-512.png', clip: { x:0, y:0, width:512, height:512 } });
  console.log('✓ icon-512.png');

  // 192×192
  await page.setViewportSize({ width: 192, height: 192 });
  await page.evaluate(() => {
    const c = document.getElementById('c');
    c.style.width  = '192px';
    c.style.height = '192px';
  });
  // Take screenshot and let playwright scale it
  await page.screenshot({ path: 'icon-192.png', clip: { x:0, y:0, width:512, height:512 } });
  // Actually re-capture at native 192
  await page.setViewportSize({ width: 512, height: 512 });
  const buf512 = await page.screenshot({ clip: { x:0, y:0, width:512, height:512 } });

  // Use sharp-free resize via a second page
  const page2 = await browser.newPage();
  await page2.setViewportSize({ width: 192, height: 192 });
  await page2.setContent(`<html><body style="margin:0;padding:0;background:#000">
    <img id="img" style="width:192px;height:192px">
    <canvas id="out" width="192" height="192" style="display:none"></canvas>
  </body></html>`);
  const b64_512 = buf512.toString('base64');
  await page2.evaluate(async (b64) => {
    return new Promise(resolve => {
      const img = document.getElementById('img');
      img.onload = resolve;
      img.src = 'data:image/png;base64,' + b64;
    });
  }, b64_512);
  await page2.evaluate(() => {
    const img = document.getElementById('img');
    const out = document.getElementById('out');
    const ctx = out.getContext('2d');
    ctx.drawImage(img, 0, 0, 192, 192);
  });
  const buf192 = await page2.screenshot({ clip: { x:0, y:0, width:192, height:192 } });
  require('fs').writeFileSync('icon-192.png', buf192);
  console.log('✓ icon-192.png');

  // 180×180 (iOS)
  const page3 = await browser.newPage();
  await page3.setViewportSize({ width: 180, height: 180 });
  await page3.setContent(`<html><body style="margin:0;padding:0;background:#000">
    <img id="img" style="width:180px;height:180px">
    <canvas id="out" width="180" height="180" style="display:none"></canvas>
  </body></html>`);
  await page3.evaluate(async (b64) => {
    return new Promise(resolve => {
      const img = document.getElementById('img');
      img.onload = resolve;
      img.src = 'data:image/png;base64,' + b64;
    });
  }, b64_512);
  await page3.evaluate(() => {
    const img = document.getElementById('img');
    const out = document.getElementById('out');
    const ctx = out.getContext('2d');
    ctx.drawImage(img, 0, 0, 180, 180);
  });
  const buf180 = await page3.screenshot({ clip: { x:0, y:0, width:180, height:180 } });
  require('fs').writeFileSync('apple-touch-icon.png', buf180);
  console.log('✓ apple-touch-icon.png (180×180)');

  await browser.close();
  console.log('\nAll icons generated!');
})();
