import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#1c1c1c"/>
  <text x="80" y="280" font-family="Helvetica, Arial, sans-serif" font-size="90" font-weight="700" fill="#ededed">Fábio Machado</text>
  <text x="80" y="370" font-family="Helvetica, Arial, sans-serif" font-size="42" fill="#a1a1a1">Macheidan Labs</text>
  <text x="80" y="540" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#737373">Agentes de IA dentro de empresas reais</text>
  <text x="80" y="580" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#6e6e6e">fabiomachado.com.br</text>
</svg>`;

await sharp(Buffer.from(svg, 'utf-8'))
	.png()
	.toFile('public/og-default.png');

console.log('Generated public/og-default.png');
