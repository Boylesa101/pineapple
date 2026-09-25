window.mountSites = function () {
  const el = document.getElementById('pvs'); if (!el) return;
  const S = window.SITES || [];
  let i = 0, mode = 'laptop';
  const nm = s => s.n.replace('&', '&amp;');
  el.innerHTML = `<div class="dev" id="dev">
<div class="dev-seg" id="dev-seg"><span class="dev-pill"></span><button class="on" data-m="laptop"><i class="ti ti-device-laptop"></i>Desktop</button><button data-m="phone"><i class="ti ti-device-mobile"></i>Mobile</button></div>
<div class="dev-stage"><div class="dev-frame" id="dev-frame"><span class="dev-cam"></span><div class="dev-screen">
<div class="dev-bar"><div class="dev-status"><span>9:41</span><span><i class="ti ti-antenna-bars-5"></i><i class="ti ti-wifi"></i><i class="ti ti-battery-3"></i></span></div><div class="dev-dots"><span class="pv-dot" style="background:#ec6a5e"></span><span class="pv-dot" style="background:#f4bf4f"></span><span class="pv-dot" style="background:#61c554"></span></div><div class="dev-url" id="dev-url"></div></div>
<div class="pvs-track" id="dev-track">${S.map(s => `<div class="pvs-slide">${s.html}</div>`).join('')}</div>
<div class="dev-home"><i></i></div></div></div><div class="dev-base"></div></div>
<div class="dev-ctrl"><div class="pvs-cap" id="pvs-cap"></div><div class="pvs-dots" id="pvs-dots">${S.map(s => `<button aria-label="${nm(s)}"></button>`).join('')}</div><div class="pvs-btns"><button class="pvs-arr" data-d="-1" aria-label="Previous"><i class="ti ti-chevron-left"></i></button><button class="pvs-arr" data-d="1" aria-label="Next"><i class="ti ti-chevron-right"></i></button></div></div></div>`;
  const dev = el.querySelector('#dev'), fr = el.querySelector('#dev-frame'), tr = el.querySelector('#dev-track'), seg = el.querySelector('#dev-seg'), pill = seg.querySelector('.dev-pill');
  const movePill = () => { const b = seg.querySelector('button.on'); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 3}px)`; };
  const upd = () => {
    el.querySelectorAll('#pvs-dots button').forEach((d, j) => d.classList.toggle('on', j === i));
    el.querySelector('#pvs-cap').innerHTML = `${nm(S[i])}<span>${S[i].k}</span>`;
    el.querySelector('#dev-url').textContent = S[i].url;
  };
  const go = n => { i = (n + S.length) % S.length; tr.scrollTo({ left: i * tr.clientWidth, behavior: 'smooth' }); upd(); };
  tr.addEventListener('scroll', () => { if (fr.classList.contains('morph')) return; const n = Math.round(tr.scrollLeft / tr.clientWidth); if (n !== i) { i = n; upd(); } }, { passive: true });
  el.querySelectorAll('#pvs-dots button').forEach((d, j) => d.onclick = () => go(j));
  el.querySelectorAll('.pvs-arr').forEach(b => b.onclick = () => go(i + +b.dataset.d));
  seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    const m = b.dataset.m; if (m === mode) return; mode = m;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); movePill();
    fr.classList.add('morph');
    fr.classList.toggle('phone', m === 'phone'); dev.classList.toggle('is-phone', m === 'phone');
    setTimeout(() => { tr.scrollLeft = i * tr.clientWidth; tr.scrollTop = 0; tr.querySelectorAll('.pvs-slide').forEach(s => s.scrollTop = 0); fr.classList.remove('morph'); }, 620);
  });
  upd(); requestAnimationFrame(movePill);
};
