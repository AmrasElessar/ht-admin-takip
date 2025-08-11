// scripts/create-icons.js
// PWA için gerekli ikonları oluşturmak için script

const fs = require('fs')
const path = require('path')

// Basit SVG ikon oluşturucu
function createSVGIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#007bff" rx="12"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="white" font-size="${Math.floor(size * 0.3)}" font-family="Arial, sans-serif" font-weight="bold">
    HT
  </text>
</svg>`
}

// HTML Canvas kullanarak PNG oluştur
function createHTMLIconGenerator() {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script>
        const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

        sizes.forEach(size => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Arka plan
            ctx.fillStyle = '#007bff';
            ctx.roundRect(0, 0, size, size, size * 0.1);
            ctx.fill();

            // Metin
            ctx.fillStyle = 'white';
            ctx.font = 'bold ' + (size * 0.3) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('HT', size / 2, size / 2);

            // Download link oluştur
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`icon-\${size}x\${size}.png\`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });

        // roundRect polyfill
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                this.beginPath();
                this.moveTo(x + r, y);
                this.lineTo(x + w - r, y);
                this.quadraticCurveTo(x + w, y, x + w, y + r);
                this.lineTo(x + w, y + h - r);
                this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                this.lineTo(x + r, y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - r);
                this.lineTo(x, y + r);
                this.quadraticCurveTo(x, y, x + r, y);
                this.closePath();
            };
        }
    </script>
</body>
</html>`
}

// Klasör oluştur
const publicDir = path.join(process.cwd(), 'public')
const iconsDir = path.join(publicDir, 'icons')

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
  console.log('✅ Icons klasörü oluşturuldu:', iconsDir)
}

// HTML ikon generator dosyası oluştur
const generatorPath = path.join(iconsDir, 'generator.html')
fs.writeFileSync(generatorPath, createHTMLIconGenerator())
console.log('✅ Icon generator oluşturuldu:', generatorPath)

// SVG dosyalarını oluştur
const sizes = [192, 512]
sizes.forEach((size) => {
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`)
  fs.writeFileSync(svgPath, createSVGIcon(size))
  console.log(`✅ SVG ikon oluşturuldu: icon-${size}x${size}.svg`)
})

// Basit favicon.ico için HTML
const faviconHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Favicon Generator</title>
</head>
<body>
    <canvas id="canvas" width="32" height="32"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Basit HT favicon
        ctx.fillStyle = '#007bff';
        ctx.fillRect(0, 0, 32, 32);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HT', 16, 16);

        // Canvas'ı PNG olarak indir
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'favicon.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    </script>
    <p>Favicon generator - favicon.png olarak indirilecek</p>
</body>
</html>`

fs.writeFileSync(path.join(iconsDir, 'favicon-generator.html'), faviconHTML)

console.log(`
🎯 Icon oluşturma tamamlandı!

📝 Manuel adımlar:
1. Browser'da şu dosyaları açın:
   - public/icons/generator.html (PNG ikonları için)
   - public/icons/favicon-generator.html (Favicon için)

2. Dosyalar otomatik olarak indirilecek

3. İndirilen dosyaları public/icons/ klasörüne taşıyın

4. Favicon.png'yi favicon.ico'ya çevirin (online converter kullanın)

🔗 Alternatif:
- https://realfavicongenerator.net/ sitesini kullanarak profesyonel ikonlar oluşturabilirsiniz
`)

module.exports = { createSVGIcon, createHTMLIconGenerator }
