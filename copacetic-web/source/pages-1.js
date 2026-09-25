window.PAGES = window.PAGES || {};
const NOTS = '<div class="nots"><span><i class="ti ti-x"></i>No Wix</span><span><i class="ti ti-x"></i>No WordPress templates</span><span><i class="ti ti-x"></i>No page builders</span></div>';
window.NOTS = NOTS;
const hero = (eb, h, p) => `<div class="mk-phero"><div class="mk-eyebrow">${eb}</div><h1>${h}</h1><p>${p}</p></div>`;
window.hero = hero;
const SERVICES = [
['web-design','layout-2','Web design','Bespoke websites designed from a blank page around your brand. Every site is a PWA and mobile responsive.'],
['apps','device-mobile','iOS & Android apps','Native apps for your company, scoped and priced per project.'],
['ai','message-chatbot','AI chatbots','An AI assistant on your website that answers enquiries in your firm\'s voice.'],
['branding','fingerprint','Branding','Company branding for new law firms: name, logo, colours and identity.'],
['solicitors','user-circle','Solicitor profile sites','Personal websites for consultant solicitors and individual lawyers.'],
['seo','chart-line','SEO','Built so the right clients can find you when they search.'],
['social','message-circle-2','Social media','Consistent, on-brand channels that point people back to your site.'],
['analytics','report-analytics','Custom analytics','No confusing charts. A simple monthly report on the key numbers you choose.'],
['hosting','shield-lock','Hosting & security','Our own servers in a UK data centre, built to ISO 27001 standards.']];
const svcGrid = () => `<div class="mk-feat-grid g4">${SERVICES.map(([r,ic,h,p])=>`<a class="mk-feat" href="#${r}"><div class="mk-feat-ic"><i class="ti ti-${ic}"></i></div><h3>${h}</h3><p>${p}</p><span class="more">Learn more <i class="ti ti-arrow-right"></i></span></a>`).join('')}</div>`;

PAGES.home = `
<div class="mk-hero">
<div>
<div class="mk-eyebrow">Web design bureau · Specialists in legal</div>
<h1>Websites as unique as <em>you and your company</em> are.</h1>
<p>No Wix or WordPress templates. We design every site to your needs, your brand and your identity, then host it on our own secure UK servers, built to ISO 27001 standards.</p>
<div class="mk-hero-cta"><a class="mk-btn mk-btn-dark mk-btn-lg" href="#contact">Start a project <i class="ti ti-arrow-right"></i></a><a class="mk-btn mk-btn-ghost mk-btn-lg" href="#clients">See our work</a></div>
<div class="mk-hero-note">Every site is a PWA and mobile responsive, as standard.</div>
</div>
<div class="pv-wrap"><div id="pvs"></div></div>
</div>
<div class="mk-trust"><span>Companies we work with</span><div class="mk-trust-row" id="trust"></div></div>
<section class="mk-features">
<div class="mk-sec-head"><div class="mk-eyebrow">What we do</div><h2>Everything your firm needs online, from one team.</h2></div>
${svcGrid()}
</section>
<section class="mk-spot"><div class="mk-spot-in">
<div class="mk-spot-copy"><div class="mk-eyebrow">Built for law firms</div><h2>We understand what a law firm website has to do.</h2><p>Regulatory information, transparent pricing and your clients' data all need handling properly. We build that in from the start.</p>
<ul class="mk-spot-list">
<li><span class="mk-spot-ic"><i class="ti ti-certificate"></i></span><div><strong>SRA requirements</strong><span>Regulatory details, the SRA digital badge and complaints information in the right places.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-receipt-2"></i></span><div><strong>Price transparency</strong><span>Clear fee pages for the services the SRA Transparency Rules cover.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-lock"></i></span><div><strong>Client data security</strong><span>Encrypted enquiry forms, UK GDPR-ready privacy and cookie consent, hosted in the UK.</span></div></li>
</ul><a class="mk-btn mk-btn-dark" href="#legal">For law firms <i class="ti ti-arrow-right"></i></a></div>
<div class="mk-spot-art" id="server-card"></div>
</div></section>`;

PAGES.services = hero('Services', 'Everything your firm needs online.', 'Design, apps, AI, branding, search, social and secure hosting, from one team.') + `<section class="mk-features">${svcGrid()}</section>`;

PAGES['web-design'] = hero('Web design', 'Designed to your needs, your brand, your identity.', "We don't start from a Wix or WordPress template. Every Copacetic site is designed and built from scratch, so it looks and works like your company and nobody else's.") + `
<section class="mk-features">
<div class="mk-sec-head"><div class="mk-eyebrow">How we work</div><h2>From first call to launch.</h2></div>
<div class="steps">
<div class="step"><div class="n">01</div><h4>Discovery</h4><p>We learn about your company, your clients and what the site needs to do.</p></div>
<div class="step"><div class="n">02</div><h4>Design</h4><p>Original designs built around your brand, for you to review and refine.</p></div>
<div class="step"><div class="n">03</div><h4>Build</h4><p>Hand-built as a PWA, mobile responsive, with SEO in place from day one.</p></div>
<div class="step"><div class="n">04</div><h4>Launch &amp; host</h4><p>We launch on our own secure UK servers and look after it from there.</p></div>
</div>
</section>
<section class="mk-spot white"><div class="mk-spot-in">
<div class="mk-spot-copy"><div class="mk-eyebrow">In every package</div><h2>A site that is yours, top to bottom.</h2>
<ul class="mk-spot-list">
<li><span class="mk-spot-ic"><i class="ti ti-palette"></i></span><div><strong>Original design</strong><span>No templates or themes.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-apps"></i></span><div><strong>Progressive Web App</strong><span>Installable on phones and desktops, fast, and works with a weak signal.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-devices"></i></span><div><strong>Mobile responsive</strong><span>Works on phone, tablet and desktop.</span></div></li>
</ul>${NOTS}</div>
<div class="mk-spot-art" id="server-card"></div>
</div></section>`;
