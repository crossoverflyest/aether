// SVG をベースに PNG / ICO 各サイズのアイコンを生成
const sharp = require("sharp");
const pngToIcoModule = require("png-to-ico");
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const fs = require("fs");
const path = require("path");

const ASSETS = path.resolve(__dirname, "..", "assets");
const SVG_PATH = path.join(ASSETS, "icon.svg");
const PNG_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function buildIcons() {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error(`SVG not found: ${SVG_PATH}`);
  }
  const svg = fs.readFileSync(SVG_PATH);

  // 各サイズの PNG を生成
  for (const size of PNG_SIZES) {
    const out = path.join(ASSETS, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`✓ ${out}`);
  }

  // 標準アイコン（開発時 BrowserWindow 用）
  const mainPng = path.join(ASSETS, "icon.png");
  await sharp(svg).resize(512, 512).png().toFile(mainPng);
  console.log(`✓ ${mainPng}`);

  // Windows 用 ICO（複数サイズを 1 ファイルにまとめる）
  const icoSources = [16, 24, 32, 48, 64, 128, 256].map(s =>
    path.join(ASSETS, `icon-${s}.png`)
  );
  const icoBuf = await pngToIco(icoSources);
  const icoPath = path.join(ASSETS, "icon.ico");
  fs.writeFileSync(icoPath, icoBuf);
  console.log(`✓ ${icoPath}`);

  console.log("\nアイコン生成完了！");
}

buildIcons().catch(err => {
  console.error("アイコン生成失敗:", err);
  process.exit(1);
});
