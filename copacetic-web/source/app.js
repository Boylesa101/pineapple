const CLIENTS = [['T&M Legal Consulting Ltd','Legal consultancy'],['Barker & Dixon','Law firm'],['Copacetic.legal','Legal tech'],['Inquiri',''],['Taylor Rose Cumbria','Law firm'],['Felicity Marsden',''],['Tedius',''],['Honest Coffee','Coffee shop'],['Explore Cumbria','']];
const esc = s => s.replace(/&/g, '&amp;');
const SERVER = `<div class="sm"><div class="sm-head"><span class="sm-ic"><i class="ti ti-server-2"></i></span><div><div class="sm-t">yourfirm.co.uk</div><div class="sm-d">Hosted by copacetic.web</div></div></div>
<div class="sm-row"><span>Status</span><span class="sm-ok">Online</span></div>
<div class="sm-row"><span>Location</span><span>UK data centre</span></div>
<div class="sm-row"><span>Security</span><span>Built to ISO 27001 standards</span></div>
<div class="sm-row"><span>SSL</span><span class="sm-mono">TLS · active</span></div>
<div class="sm-row"><span>PWA</span><span class="sm-mono">installable</span></div></div>`;
const ORDER = ['home','services','web-design','apps','ai','branding','solicitors','seo','social','analytics','hosting','legal','pricing','clients','about','contact'];
const NAVMAP = { 'web-design':'services', apps:'services', ai:'services', branding:'services', solicitors:'services', seo:'services', social:'services', analytics:'services', hosting:'services' };
function clientCard(c) {
  const s = (window.SITES || []).find(x => x.n === c[0]);
  const shot = s ? `<div class="cl-shot live"><div class="thumb">${s.html}</div></div>` : `<div class="cl-shot">[ ${esc(c[0])} — site screenshot ]</div>`;
  return `<a class="cl" href="#contact">${shot}<div class="cl-b"><h3>${esc(c[0])}</h3>${c[1] ? `<span class="cl-tag">${c[1]}</span>` : ''}</div></a>`;
}
function route() {
  let h = (location.hash || '#home').slice(1); if (!ORDER.includes(h)) h = 'home';
  const main = document.getElementById('main');
  main.innerHTML = `<section class="page on" data-screen-label="${h}">${PAGES[h]}</section>`;
  const t = document.getElementById('trust'); if (t) t.innerHTML = CLIENTS.map(c => `<span>${esc(c[0])}</span>`).join('');
  const s = document.getElementById('server-card'); if (s) s.innerHTML = SERVER;
  const g = document.getElementById('cl-grid'); if (g) g.innerHTML = CLIENTS.map(clientCard).join('');
  if (window.mountSites) mountSites();
  main.querySelectorAll('.chip').forEach(c => c.onclick = () => c.classList.toggle('on'));
  const f = document.getElementById('form');
  if (f) f.onsubmit = e => { e.preventDefault(); document.getElementById('ff').style.display = 'none'; document.getElementById('sent').style.display = 'block'; };
  const act = NAVMAP[h] || h;
  document.querySelectorAll('#links a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + act));
  document.getElementById('cta').style.display = h === 'contact' ? 'none' : '';
  document.getElementById('nav').classList.remove('open');
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route); route();
document.getElementById('burger').onclick = () => document.getElementById('nav').classList.toggle('open');
