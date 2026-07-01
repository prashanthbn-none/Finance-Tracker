const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = __dirname;
const assetDir = path.join(root, 'dsp_diagrams');
fs.mkdirSync(assetDir, { recursive: true });

function makePng(name) {
  const w = 1200, h = 620, png = new PNG({ width: w, height: h });
  const color = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255,255]; };
  const px = (x,y,c) => { if(x>=0&&x<w&&y>=0&&y<h){ const i=(w*y+x)<<2; png.data.set(c,i); } };
  const rect = (x,y,rw,rh,hex) => { const c=color(hex); for(let yy=y;yy<y+rh;yy++) for(let xx=x;xx<x+rw;xx++) px(xx,yy,c); };
  const circle = (cx,cy,r,hex) => { const c=color(hex); for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++) if((x-cx)**2+(y-cy)**2<=r*r) px(x,y,c); };
  const line = (x1,y1,x2,y2,t,hex) => { const c=color(hex), n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1)); for(let k=0;k<=n;k++){const x=Math.round(x1+(x2-x1)*k/n),y=Math.round(y1+(y2-y1)*k/n); for(let dy=-t;dy<=t;dy++)for(let dx=-t;dx<=t;dx++)px(x+dx,y+dy,c);} };
  rect(0,0,w,h,'#f4f9fc'); rect(0,0,w,18,'#1a3a5c');
  if (name.includes('overview')) {
    [[70,220,210,150,'#dcecf7'],[390,180,280,230,'#b9d8ea'],[790,110,250,140,'#e8f3e8'],[790,350,250,140,'#f5ead5']].forEach(a=>rect(...a));
    line(280,295,390,295,4,'#2874a6'); line(670,295,790,180,4,'#2874a6'); line(670,295,790,420,4,'#2874a6');
  } else if (name.includes('centrifugation')) {
    circle(330,310,220,'#dcecf7'); circle(330,310,55,'#1a3a5c');
    for(let a=0;a<6;a++){const ang=a*Math.PI/3; line(330,310,330+190*Math.cos(ang),310+190*Math.sin(ang),10,a%2?'#8db3cf':'#5b9bd5');}
    line(570,310,720,310,5,'#2874a6'); rect(760,150,300,120,'#e8f3e8'); rect(760,350,300,120,'#f5ead5');
  } else if (name.includes('filtration')) {
    rect(90,330,420,24,'#2874a6'); for(let i=0;i<18;i++)circle(130+(i%7)*55,285-Math.floor(i/7)*42,15,'#9b6b43'); line(300,110,300,250,5,'#2874a6'); line(300,365,300,515,5,'#2874a6');
    rect(690,360,420,24,'#2874a6'); for(let i=0;i<12;i++)circle(730+(i%6)*65,320-Math.floor(i/6)*45,14,'#9b6b43'); line(690,235,1100,235,5,'#2874a6'); line(900,395,900,530,5,'#2874a6');
  } else if (name.includes('atps')) {
    rect(120,170,360,150,'#dceff7'); rect(120,320,360,190,'#f6e8b7'); for(let i=0;i<14;i++)circle(165+(i%5)*63,365+Math.floor(i/5)*55,14,'#725441');
    for(let i=0;i<16;i++)circle(700+(i%4)*85,170+Math.floor(i/4)*70,17,'#8fadc1'); line(825,430,825,500,5,'#2874a6'); for(let i=0;i<3;i++)circle(720+i*105,550,42,'#4c7694');
  } else {
    const vals=[[10,8,10,6,3,9],[5,9,5,4,5,6],[6,7,6,8,8,6],[9,9,9,9,4,8],[8,6,7,8,9,7],[6,8,6,10,6,8]], cs=['#1a3a5c','#2874a6','#5b9bd5','#5b8c6f','#c38d3f','#8b6ca8'];
    vals.forEach((row,i)=>row.forEach((v,j)=>rect(130+j*170,95+i*80,v*13,38,cs[i])));
  }
  return PNG.sync.write(png);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = (title, subtitle, body, width = 1200, height = 650) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7fbff"/><stop offset="1" stop-color="#e8f1f8"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-opacity=".14"/></filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#2874a6"/></marker>
  </defs>
  <rect width="100%" height="100%" rx="24" fill="url(#bg)"/>
  <text x="60" y="62" font-family="Arial" font-size="32" font-weight="700" fill="#173b5e">${esc(title)}</text>
  <text x="60" y="98" font-family="Arial" font-size="18" fill="#567086">${esc(subtitle)}</text>
  ${body}
</svg>`;

const box = (x, y, w, h, title, note, fill = '#ffffff') => `
  <g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="#8db3cf" stroke-width="2"/>
  <text x="${x + w / 2}" y="${y + 43}" text-anchor="middle" font-family="Arial" font-size="23" font-weight="700" fill="#173b5e">${esc(title)}</text>
  <text x="${x + w / 2}" y="${y + 75}" text-anchor="middle" font-family="Arial" font-size="16" fill="#516b7e">${esc(note)}</text></g>`;
const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2874a6" stroke-width="5" marker-end="url(#arrow)"/>`;

const diagrams = {
  'fig1_overview.png': svg('Primary recovery workflow', 'From fermentation broth to clarified product stream',
    box(50,180,220,120,'Fermentation broth','cells + product','#fff') + arrow(270,240,340,240) +
    box(350,150,240,180,'Solid-liquid separation','centrifugation | filtration','#eef7fc') + arrow(590,240,660,240) +
    box(670,130,220,100,'Cell fraction','harvest / disposal','#f7f2e8') +
    box(670,300,220,100,'Clarified liquor','extracellular product','#eaf6ef') +
    `<path d="M620 240 Q645 240 670 180" fill="none" stroke="#2874a6" stroke-width="5" marker-end="url(#arrow)"/><path d="M620 250 Q645 270 670 340" fill="none" stroke="#2874a6" stroke-width="5" marker-end="url(#arrow)"/>` +
    box(940,215,210,110,'Downstream steps','capture + polishing','#fff'),1200,560),

  'fig2_centrifugation.png': svg('Centrifugation principles', 'Sedimentation under enhanced gravitational force',
    `<g transform="translate(80 145)"><ellipse cx="210" cy="185" rx="165" ry="165" fill="#fff" stroke="#8db3cf" stroke-width="4"/><circle cx="210" cy="185" r="40" fill="#1a3a5c"/><path d="M210 185 L330 90 A155 155 0 0 1 355 250 Z" fill="#dcecf7"/><path d="M210 185 L85 275 A155 155 0 0 1 60 115 Z" fill="#edf5fa"/><path d="M210 185 L115 65 A155 155 0 0 1 280 42 Z" fill="#c9dfed"/><text x="210" y="385" text-anchor="middle" font-family="Arial" font-size="20" fill="#173b5e">Disc-stack bowl</text></g>` +
    arrow(455,330,610,330) + box(650,150,450,105,'Feed enters rotating bowl','particles move outward; liquid inward','#fff') +
    box(650,300,210,120,'Solids discharge','concentrated cells','#f7f2e8') + box(890,300,210,120,'Liquid outlet','clarified stream','#eaf6ef') +
    `<text x="650" y="500" font-family="Arial" font-size="19" fill="#567086">Relative centrifugal force: RCF = omega²r / g</text>`,1200,620),

  'fig3_filtration.png': svg('Filtration modes', 'Dead-end and tangential-flow configurations',
    `<text x="255" y="155" text-anchor="middle" font-family="Arial" font-size="25" font-weight="700" fill="#173b5e">Dead-end</text><rect x="80" y="300" width="350" height="18" fill="#2874a6"/><g fill="#9b6b43">${[0,1,2,3,4,5].map(i=>`<circle cx="${130+i*50}" cy="${270-(i%2)*30}" r="16"/>`).join('')}</g>` + arrow(255,180,255,250) + arrow(255,335,255,445) + `<text x="255" y="490" text-anchor="middle" font-family="Arial" font-size="18" fill="#567086">cake builds on membrane</text>` +
    `<line x1="600" y1="130" x2="600" y2="500" stroke="#bed0dc" stroke-width="3"/>` +
    `<text x="900" y="155" text-anchor="middle" font-family="Arial" font-size="25" font-weight="700" fill="#173b5e">Tangential flow</text><rect x="700" y="330" width="390" height="18" fill="#2874a6"/>` + arrow(700,260,1070,260) + arrow(895,360,895,470) +
    `<g fill="#9b6b43">${[0,1,2,3,4,5].map(i=>`<circle cx="${745+i*60}" cy="${305-(i%2)*25}" r="14"/>`).join('')}</g><text x="900" y="505" text-anchor="middle" font-family="Arial" font-size="18" fill="#567086">crossflow limits cake formation</text>`,1200,580),

  'fig5_atps_flocculation.png': svg('Integrated clarification alternatives', 'Aqueous two-phase extraction and flocculation',
    `<g transform="translate(110 145)"><path d="M40 0 H340 L300 370 H80 Z" fill="#fff" stroke="#8db3cf" stroke-width="4"/><path d="M72 205 H308 L300 370 H80 Z" fill="#f6e8b7"/><path d="M58 95 H322 L310 205 H70 Z" fill="#dceff7"/><g fill="#725441">${[0,1,2,3,4,5,6].map(i=>`<circle cx="${105+(i%4)*55}" cy="${235+Math.floor(i/4)*55}" r="13"/>`).join('')}</g><text x="190" y="75" text-anchor="middle" font-family="Arial" font-size="20" fill="#173b5e">PEG-rich product phase</text><text x="190" y="330" text-anchor="middle" font-family="Arial" font-size="19" fill="#6b5421">salt-rich solids phase</text></g>` +
    `<line x1="590" y1="125" x2="590" y2="545" stroke="#bed0dc" stroke-width="3"/><g transform="translate(690 180)"><g fill="#8fadc1">${[0,1,2,3,4,5,6,7].map(i=>`<circle cx="${40+(i%4)*85}" cy="${25+Math.floor(i/4)*85}" r="18"/>`).join('')}</g>${arrow(180,180,180,260)}<g fill="#4c7694">${[0,1,2].map(i=>`<circle cx="${115+i*65}" cy="330" r="38"/>`).join('')}</g><text x="180" y="420" text-anchor="middle" font-family="Arial" font-size="20" fill="#173b5e">charge neutralisation + bridging</text></g>`,1200,620),
};

const methods = [
  ['Disc stack', [10,8,10,6,3,9]], ['Tubular bowl',[5,9,5,4,5,6]], ['Dead-end',[6,7,6,8,8,6]],
  ['TFF / MF',[9,9,9,9,4,8]], ['Flocculation',[8,6,7,8,9,7]], ['ATPS',[6,8,6,10,6,8]],
];
const colors = ['#1a3a5c','#2874a6','#5b9bd5','#5b8c6f','#c38d3f','#8b6ca8'];
const labels = ['Throughput','Clarification','Scalability','Low shear','Low cost','Versatility'];
let bars = '';
methods.forEach((m, i) => {
  bars += `<text x="210" y="${164+i*65}" text-anchor="end" font-family="Arial" font-size="17" fill="#173b5e">${m[0]}</text>`;
  m[1].forEach((v,j)=> bars += `<rect x="${230+j*145}" y="${142+i*65}" width="${v*11}" height="24" rx="4" fill="${colors[i]}"/><text x="${235+v*11+j*145}" y="${161+i*65}" font-family="Arial" font-size="13" fill="#40586b">${v}</text>`);
});
diagrams['fig4_comparison.png'] = svg('Comparative performance', 'Scores from 1 (low) to 10 (high)', labels.map((l,j)=>`<text x="${285+j*145}" y="120" text-anchor="middle" font-family="Arial" font-size="15" fill="#567086">${l}</text>`).join('') + bars,1200,590);

async function main() {
  for (const name of Object.keys(diagrams)) {
    fs.writeFileSync(path.join(assetDir, name), makePng(name));
  }
  const sourcePath = 'C:\\Users\\Prashanth B N\\.codex\\attachments\\1594c001-86f9-40d6-9a1c-05d4fe69c5e9\\pasted-text.txt';
  let source = fs.readFileSync(sourcePath, 'utf8');
  source = source.replace(/`\/home\/claude\/dsp_diagrams\/\$\{filename\}`/g, 'path.join(__dirname, "dsp_diagrams", filename)');
  source = source.replace('new PageNumber()', "new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '555555' })");
  source = source.replace("'/home/claude/DSP_Cell_Separation_MSc_Assignment.docx'", "path.join(__dirname, 'DSP_Cell_Separation_MSc_Assignment.docx')");
  const run = new Function('require', '__dirname', source);
  run(require, root);
}

main().catch((error) => { console.error(error); process.exit(1); });
