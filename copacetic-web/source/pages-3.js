const f3 = items => `<section class="mk-features"><div class="mk-feat-grid g3">${items.map(([ic,h,p])=>`<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-${ic}"></i></div><h3>${h}</h3><p>${p}</p></div>`).join('')}</div></section>`;
window.f3 = f3;

PAGES.apps = hero('iOS & Android apps', 'Apps for your company, on every phone.', 'We design and build native iOS and Android apps around your brand. Each app is scoped and priced per project.') + f3([
['brand-apple','iOS','Built for iPhone and iPad and published to the App Store.'],
['brand-android','Android','Built for Android phones and tablets and published to Google Play.'],
['shield-lock','Secure by design','Client data handled with the same care as our hosting.']]) +
`<div class="mk-phero" style="padding-top:0"><a class="mk-btn mk-btn-dark mk-btn-lg" href="#contact">Discuss your app <i class="ti ti-arrow-right"></i></a></div>`;

PAGES.ai = hero('AI chatbots', 'An assistant on your website.', 'An AI chatbot that answers common questions, takes enquiries and points visitors to the right page, in your firm\'s voice.') + `
<section class="mk-spot white"><div class="mk-spot-in">
<div class="mk-spot-copy"><div class="mk-eyebrow">How it works</div><h2>Answers enquiries while you work.</h2>
<ul class="mk-spot-list">
<li><span class="mk-spot-ic"><i class="ti ti-message-chatbot"></i></span><div><strong>Trained on your site</strong><span>Answers from your services, fees and FAQs.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-inbox"></i></span><div><strong>Captures enquiries</strong><span>Collects details and passes them to your team.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-scale"></i></span><div><strong>Knows its limits</strong><span>Gives general information, not legal advice, and says so.</span></div></li>
</ul></div>
<div class="mk-spot-art"><div class="sm"><div class="sm-head"><span class="sm-ic"><i class="ti ti-message-chatbot"></i></span><div><div class="sm-t">Ask us a question</div><div class="sm-d">Usually replies instantly</div></div></div>
<div class="chat-b me">Do you handle conveyancing in Oxford?</div>
<div class="chat-b">Yes, our property team handles residential and commercial conveyancing. You can see our fees on the Fees page. Would you like someone to call you?</div>
<div class="chat-b me">Yes please</div></div></div>
</div></section>`;

PAGES.branding = hero('Branding', 'Branding for new law firms.', 'Starting a firm? We create your name, logo, colours and identity, then carry it through your website, social media and documents.') + f3([
['pencil','Logo & identity','A mark and wordmark that are yours alone.'],
['palette','Colours & type','A palette and typefaces that work on screen and in print.'],
['file-description','Brand guidelines','A short guide so everything stays consistent.']]);

PAGES.solicitors = hero('Solicitor profile sites', 'A website of your own.', 'Profile websites for consultant solicitors and individual lawyers: your experience, your practice areas and how to instruct you.') + f3([
['user-circle','Your profile','Experience, qualifications and practice areas, clearly set out.'],
['certificate','Regulatory details','SRA information and your platform firm shown correctly.'],
['calendar','Easy to instruct','Enquiry forms and booking that go straight to you.']]);

PAGES.legal = hero('For law firms', 'We understand law firm websites.', 'A law firm website has regulatory and data-protection duties most agencies don\'t know about. We do.') + `
<section class="mk-features"><div class="mk-sec-head"><div class="mk-eyebrow">Requirements</div><h2>Built in from the start.</h2></div><div class="mk-feat-grid g3">
<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-certificate"></i></div><h3>SRA information</h3><p>Regulatory status, SRA number and the SRA digital badge displayed as required.</p></div>
<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-receipt-2"></i></div><h3>Price transparency</h3><p>Fee and service pages for the areas covered by the SRA Transparency Rules.</p></div>
<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-message-report"></i></div><h3>Complaints information</h3><p>Your complaints procedure and Legal Ombudsman details, easy to find.</p></div>
<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-accessible"></i></div><h3>Accessibility</h3><p>Readable, keyboard-friendly pages that work for every client.</p></div>
<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-cookie"></i></div><h3>Privacy &amp; cookies</h3><p>UK GDPR-ready privacy notices and proper cookie consent.</p></div>
<div class="mk-feat"><div class="mk-feat-ic"><i class="ti ti-building-bank"></i></div><h3>Payment warnings</h3><p>Clear notices on bank-detail changes to help protect clients from fraud.</p></div>
</div></section>
<section class="mk-spot white"><div class="mk-spot-in">
<div class="mk-spot-copy"><div class="mk-eyebrow">Client data security</div><h2>Your clients' data stays protected.</h2>
<ul class="mk-spot-list">
<li><span class="mk-spot-ic"><i class="ti ti-lock"></i></span><div><strong>Encrypted forms</strong><span>Enquiries are sent over encrypted connections.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-map-pin"></i></span><div><strong>UK hosting</strong><span>Our own servers in a UK data centre.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-shield-check"></i></span><div><strong>Built to ISO 27001 standards</strong><span>Security practices that follow ISO 27001.</span></div></li>
<li><span class="mk-spot-ic"><i class="ti ti-eye-off"></i></span><div><strong>No third-party site builders</strong><span>Your data isn't passed to template platforms.</span></div></li>
</ul></div>
<div class="mk-spot-art" id="server-card"></div>
</div></section>`;
