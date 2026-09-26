const feat3 = items => `<section class="mk-features"><div class="mk-feat-grid g3">${items.map(([ic,h,p])=>`<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-${ic}"></i></div><h3>${h}</h3><p>${p}</p></div>`).join('')}</div></section>`;

PAGES.seo = hero('SEO', 'Be found by the clients you want.', 'Search visibility built into your site from the start, then maintained as your company grows.') + feat3([
['code','Technical SEO','Fast, clean, well-structured pages that search engines can read properly.'],
['map-pin','Local search','Show up when people nearby search for what you do.'],
['file-text','Content','Pages written around what your clients actually search for.']]);

PAGES.social = hero('Social media', 'Social channels that sound like you.', 'We plan, create and manage your social media so it stays consistent with your brand and points people back to your site.') + feat3([
['calendar','Planning','A content calendar agreed with you in advance.'],
['palette','On-brand content','Posts and graphics designed to match your website and identity.'],
['brand-linkedin','Management','We post and look after your channels so you can get on with the work.']]);

PAGES.hosting = hero('Hosting & security', 'Hosted on our own secure servers.', 'Your site lives on our servers in a UK data centre, built to ISO 27001 standards. No template platforms, no third-party site builders.') + `
<section class="mk-spot white"><div class="mk-spot-in">
<div class="mk-spot-copy"><div class="mk-eyebrow">Secure by design</div><h2>Where your website lives matters.</h2><p>Keeping hosting in the UK and in our own hands means we know exactly how your site is secured.</p>
<ul class="mk-spot-list">
<li><span class="mk-spot-ic"><i class="ti ti-map-pin"></i></span><div><strong>UK data centre</strong><span>Your site is hosted in the UK.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-shield-check"></i></span><div><strong>Built to ISO 27001 standards</strong><span>Our hosting follows ISO 27001 security practices.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-lock"></i></span><div><strong>SSL on every site</strong><span>Encrypted connections as standard.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-server"></i></span><div><strong>Managed by us</strong><span>Not a site-builder platform.</span></div></li>
</ul>${NOTS}</div>
<div class="mk-spot-art" id="server-card"></div>
</div></section>`;

const tier = (name, feats, featured, cta) => `<div class="price-card${featured?' featured':''}">${featured?'<div class="price-badge">Most popular</div>':''}<div class="price-name">${name}</div><div class="price-tagline">[Who this is for]</div><div class="price-amt"><span class="price-cur">£</span><span class="price-n">—</span></div><div class="price-tbc">Price to be confirmed</div><a class="mk-btn mk-btn-lg ${featured?'mk-btn-dark':'mk-btn-ghost'}" href="#contact">${cta}</a><ul class="price-feats">${feats.map(f=>`<li><i class="ti ti-check"></i>${f}</li>`).join('')}</ul></div>`;
PAGES.pricing = hero('Pricing', 'Clear, fixed packages.', 'Every package is bespoke design, hosted on our own secure UK servers.') + `<div class="price-grid">
${tier('Essential',['Bespoke design, no templates','Progressive Web App (PWA)','Mobile responsive','Hosting on our UK servers','[Inclusions to confirm]'],false,'Get started')}
${tier('Professional',['Everything in Essential','SEO','Social media','[Inclusions to confirm]'],true,'Get started')}
${tier('Bespoke',['Everything in Professional','AI chatbot for your website','[Inclusions to confirm]'],false,'Talk to us')}
</div>
<div class="price-proj"><div><div class="price-name">iOS &amp; Android apps</div><div class="price-tagline">Priced per project, based on what your app needs to do.</div></div><a class="mk-btn mk-btn-ghost mk-btn-lg" href="#contact">Request a quote</a></div>
<div class="price-allinc"><span><i class="ti ti-circle-check"></i>PWA in every package</span><span><i class="ti ti-circle-check"></i>Mobile responsive</span><span><i class="ti ti-circle-check"></i>UK data centre</span><span><i class="ti ti-circle-check"></i>Built to ISO 27001 standards</span><span><i class="ti ti-circle-check"></i>No Wix or WordPress templates</span></div>`;

PAGES.clients = hero('Clients', 'Companies we work with.', 'From law firms and consultant solicitors to legal tech and independent businesses.') + '<div class="cl-grid" id="cl-grid"></div>';

PAGES.about = hero('About us', 'A web design bureau for the legal sector.', 'We specialise in websites for law firms and legal tech start-ups, designed from scratch and hosted on our own secure UK servers.') + `
<div class="about-story">
<p>Every business is different, so your website should be too. We don't use Wix or WordPress templates. We design each site to your needs, your brand and your identity, so it is <em>as unique as you and your company are.</em></p>
<div class="about-todo">[Our story: founders, where you're based, how long you've been going, the team. Send the details and this section gets written.]</div>
</div>
<div class="about-values">
<div class="about-val"><div class="about-val-ic"><i class="ti ti-pencil"></i></div><div class="about-val-h">Bespoke</div><div class="about-val-d">Designed from a blank page, never a template.</div></div>
<div class="about-val"><div class="about-val-ic"><i class="ti ti-scale"></i></div><div class="about-val-h">Legal specialists</div><div class="about-val-d">Law firms and legal tech start-ups are our focus.</div></div>
<div class="about-val"><div class="about-val-ic"><i class="ti ti-shield-lock"></i></div><div class="about-val-h">Secure</div><div class="about-val-d">Our own UK servers, built to ISO 27001 standards.</div></div>
</div>`;

PAGES.contact = hero('Contact', 'Tell us about your project.', "Send a few details and we'll get back to you.") + `
<div class="contact-wrap">
<div class="contact-aside">
<div class="contact-line"><span class="contact-ic"><i class="ti ti-mail"></i></span><div><div class="contact-line-h">Email</div><div class="contact-line-d"><a href="mailto:Andrew@copacetic.web">Andrew@copacetic.web</a></div></div></div>
<p class="contact-line-d" style="font-size:13.5px;line-height:1.6">Tell us a bit about your company and what you need. We'll reply by email.</p>
</div>
<form class="contact-form" id="form">
<div id="ff">
<div class="cf-row"><div class="cf-field"><label for="fn">Name</label><input id="fn" required></div><div class="cf-field"><label for="fc">Company</label><input id="fc"></div></div>
<div class="cf-field"><label for="fe">Email</label><input id="fe" type="email" required></div>
<div class="cf-field"><label>I'm interested in</label><div class="chips"><button type="button" class="chip">Web design</button><button type="button" class="chip">iOS &amp; Android app</button><button type="button" class="chip">AI chatbot</button><button type="button" class="chip">Branding</button><button type="button" class="chip">Solicitor profile site</button><button type="button" class="chip">SEO</button><button type="button" class="chip">Social media</button><button type="button" class="chip">Hosting</button></div></div>
<div class="cf-field"><label for="fm">Message</label><textarea id="fm"></textarea></div>
<button class="mk-btn mk-btn-dark mk-btn-lg" type="submit" style="width:100%;justify-content:center">Send message <i class="ti ti-send"></i></button>
</div>
<div class="contact-sent" id="sent"><div class="contact-sent-h">Thanks, we've got it.</div><div class="contact-sent-d">We'll be in touch soon.</div></div>
</form>
</div>`;
