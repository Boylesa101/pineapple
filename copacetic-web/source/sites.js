const LION = c => `<svg viewBox="0 0 64 64" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M32 6l6 6 8-2 2 8 8 4-4 7 4 7-8 4-2 8-8-2-6 6-6-6-8 2-2-8-8-4 4-7-4-7 8-4 2-8 8 2z"></path><path d="M24 24c2-3 14-3 16 0l2 10c0 8-5 13-10 13s-10-5-10-13z"></path><circle cx="27.5" cy="31" r="1.2" fill="${c}"></circle><circle cx="36.5" cy="31" r="1.2" fill="${c}"></circle><path d="M29 38h6l-3 3z" fill="${c}"></path><path d="M32 41v2M28 44c2 1.5 6 1.5 8 0"></path></svg>`;
const HC_IMG = 'https://static.wixstatic.com/media/b26b21_3e22f3a5d3414b65a88e00a413031874~mv2.jpg/v1/fill/w_900,h_392,q_85/b26b21_3e22f3a5d3414b65a88e00a413031874~mv2.jpg';
const HC_TALL = 'https://static.wixstatic.com/media/b26b21_e2486357e8ff46cbae368ddab8151c15~mv2.jpg/v1/fill/w_300,h_465,q_85/IMG_8512_JPG.jpg';
const TR_IMG = 'https://static.wixstatic.com/media/eb1e1c5ab5cb4b289e110f234051208f.jpg/v1/fill/w_900,h_300,q_85/eb1e1c5ab5cb4b289e110f234051208f.jpg';
window.SITES = [
{ n:'Barker & Dixon', k:'Law firm', url:'barkerdixon.co.uk', html:`<div class="ms bd">
<div class="bd-nav"><div class="bd-logo">${LION('#fff')}<div class="bd-word">BARKER &amp; DIXON<small>SOLICITORS</small></div></div><div class="bd-links"><span>Services</span><span>People</span><span>Fees</span><span>Contact</span></div></div>
<div class="bd-hero"><div><h3>Considered advice, since the first instruction.</h3><p>Private client, property and dispute resolution for individuals and businesses.</p><span class="bd-btn">Book a consultation</span></div><div class="bd-crest">${LION('rgba(255,255,255,.9)')}</div></div>
<div class="bd-svc"><div>Property<span>Residential &amp; commercial</span></div><div>Private client<span>Wills, probate, LPAs</span></div><div>Disputes<span>Litigation &amp; mediation</span></div><div>Business<span>Company &amp; contracts</span></div></div>
<div class="bd-sec"><div><h4>Our people</h4><p>Partners and solicitors who know your matter from start to finish.</p></div><div class="ph-img">[ team photo ]</div></div>
<div class="bd-sec"><div class="ph-img">[ office photo ]</div><div><h4>Transparent fees</h4><p>Published prices for conveyancing and probate, in line with SRA rules.</p></div></div>
<div class="bd-foot"><span>Barker &amp; Dixon is authorised and regulated by the Solicitors Regulation Authority.</span><span class="bd-badge">SRA · Regulated</span></div></div>` },
{ n:'Honest Coffee', k:'Coffee shop', url:'honestcoffee.shop', html:`<div class="ms hc">
<div class="hc-nav"><b>HONEST COFFEE</b><span>Our places · Menus · Online orders · Your place</span></div>
<div class="hc-hero" style="background-image:url('${HC_IMG}')"><div><h3>HONEST COFFEE</h3><p>Speciality coffee, teas &amp; hot chocolate · sweet &amp; savoury crepes and toasties, freshly made to order</p></div></div>
<div class="hc-sec"><div class="hc-tall" style="background-image:url('${HC_TALL}')"></div><div><div class="hc-lbl">honestly</div><h4>Truly great coffee &amp; food</h4><p>Freshly roasted coffee and speciality teas from local and regional suppliers, with fresh food made to order.</p><span class="hc-btn">Order our coffee</span></div></div>
<div class="hc-foot">Good honest coffee &amp; food</div></div>` },
{ n:'Taylor Rose Cumbria', k:'Law firm', url:'taylorrosecumbria.co.uk', html:`<div class="ms tr">
<div class="tr-nav"><b>Taylor Rose<small>TTKW · Cumbria</small></b><span>Home · About us · Services · Contact</span></div>
<div class="tr-hero" style="background-image:url('${TR_IMG}')"><h3>About us</h3></div>
<div class="tr-body"><h5>Taylor Rose TTKW Cumbria</h5><p>Founded in 2014 through a merger of a local award-winning conveyancing team and Taylor Rose Law TTKW.</p><h5>The team</h5>
<div class="tr-team"><div class="tr-p"><i></i><b>Felicity Marsden</b><span>Head of Property</span></div><div class="tr-p"><i></i><b>Chloe Higham</b><span>Graduate Legal Executive</span></div><div class="tr-p"><i></i><b>Jenni Armstrong</b><span>Conveyancing Assistant</span></div></div></div>
<div class="tr-foot">Authorised and regulated by the Solicitors Regulation Authority · SRA ID 623604</div></div>` }
];
window.mountSites = function () {
  const el = document.getElementById('pvs'); if (!el) return;
  const S = window.SITES;
  el.innerHTML = `<div class="pv"><div class="pv-bar"><span class="pv-dot" style="background:#ec6a5e"></span><span class="pv-dot" style="background:#f4bf4f"></span><span class="pv-dot" style="background:#61c554"></span><div class="pv-url" id="pvs-url">${S[0].url}</div></div>
<div class="pvs-track" id="pvs-track">${S.map(s => `<div class="pvs-slide">${s.html}</div>`).join('')}</div>
<div class="pvs-ctrl"><div class="pvs-cap" id="pvs-cap"></div><div class="pvs-dots" id="pvs-dots">${S.map((_, i) => `<button aria-label="Site ${i + 1}"></button>`).join('')}</div><div class="pvs-btns"><button class="pvs-arr" data-d="-1"><i class="ti ti-chevron-left"></i></button><button class="pvs-arr" data-d="1"><i class="ti ti-chevron-right"></i></button></div></div></div>`;
  const tr = document.getElementById('pvs-track'), dots = [...document.querySelectorAll('#pvs-dots button')];
  let i = 0;
  const set = n => { i = (n + S.length) % S.length; tr.scrollTo({ left: i * tr.clientWidth }); upd(); };
  const upd = () => { dots.forEach((d, j) => d.classList.toggle('on', j === i)); document.getElementById('pvs-cap').innerHTML = `${S[i].n.replace('&', '&amp;')}<span>${S[i].k}</span>`; document.getElementById('pvs-url').textContent = S[i].url; };
  dots.forEach((d, j) => d.onclick = () => set(j));
  el.querySelectorAll('.pvs-arr').forEach(b => b.onclick = () => set(i + +b.dataset.d));
  tr.addEventListener('scroll', () => { const n = Math.round(tr.scrollLeft / tr.clientWidth); if (n !== i) { i = n; upd(); } }, { passive: true });
  upd();
};
