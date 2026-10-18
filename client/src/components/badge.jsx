export const BARS={'0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',A:'wnnnnwnnw',B:'nnwnnwnnw',C:'wnwnnwnnn',D:'nnnnwwnnw',E:'wnnnwwnnn',F:'nnwnwwnnn',G:'nnnnnwwnw',H:'wnnnnwwnn',I:'nnwnnwwnn',J:'nnnnwwwnn',K:'wnnnnnnww',L:'nnwnnnnww',M:'wnwnnnnwn',N:'nnnnwnnww',O:'wnnnwnnwn',P:'nnwnwnnwn',Q:'nnnnnnwww',R:'wnnnnnwwn',S:'nnwnnnwwn',T:'nnnnwnwwn',U:'wwnnnnnnw',V:'nwwnnnnnw',W:'wwwnnnnnn',X:'nwnnwnnnw',Y:'wwnnwnnnn',Z:'nwwnwnnnn','*':'nwnnwnwnn'};
function barcode(code) {
  let x = 10; const bars = [];
  for (const ch of '*' + code + '*') {
    for (let i = 0; i < 9; i++) { const w = BARS[ch][i] === 'w' ? 5 : 2; if (i % 2 === 0) bars.push({ x, w }); x += w; }
    x += 2;
  }
  return { bars, w: x + 8 };
}
export function downloadBadge() {
  const svg = new XMLSerializer().serializeToString(document.getElementById('badge'));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = 680; c.height = 860;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 680, 860); x.drawImage(img, 0, 0, 680, 860);
    const a = document.createElement('a'); a.download = 'visitor-badge.png'; a.href = c.toDataURL('image/png'); a.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
export default function Badge({ v }) {
  const W = 340, bc = barcode(v.code), sc = Math.min(1, (W - 40) / bc.w), f = 'Arial';
  return (
    <svg id="badge" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} 430`} width={W} style={{ maxWidth: '100%' }}>
      <rect width={W} height="430" rx="18" fill="#fff" stroke="#2f5bea" strokeWidth="3" />
      <rect width={W} height="70" rx="18" fill="#2f5bea" /><rect y="40" width={W} height="30" fill="#2f5bea" />
      <text x={W / 2} y="44" fill="#fff" fontFamily={f} fontSize="24" fontWeight="700" textAnchor="middle">VISITOR PASS</text>
      <text x={W / 2} y="115" fontFamily={f} fontSize="24" fontWeight="700" textAnchor="middle" fill="#111">{v.visitorName.slice(0, 24)}</text>
      <text x={W / 2} y="140" fontFamily={f} fontSize="14" textAnchor="middle" fill="#555">{v.company || 'Guest'} · Host: {v.host}</text>
      <text x={W / 2} y="175" fontFamily={f} fontSize="15" textAnchor="middle" fill="#111">{v.date} · {v.from}–{v.to}</text>
      <text x="20" y="208" fontFamily={f} fontSize="12" fill="#555">ACCESS</text>
      {v.areas.map((a, i) => <text key={a} x="20" y={228 + i * 18} fontFamily={f} fontSize="13" fill="#111">• {a}</text>)}
      <g transform={`translate(${(W - bc.w * sc) / 2},335) scale(${sc},1)`}>
        <rect width={bc.w} height="60" fill="#fff" />
        {bc.bars.map(b => <rect key={b.x} x={b.x} y="0" width={b.w} height="60" fill="#000" />)}
      </g>
      <text x={W / 2} y="420" fontFamily="monospace" fontSize="16" textAnchor="middle" fill="#111" letterSpacing="3">{v.code}</text>
    </svg>
  );
}