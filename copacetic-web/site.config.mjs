// Site-wide settings the design in source/ doesn't cover: the public URL, social
// profiles, and search metadata (<title>, meta description, structured data).
// Nothing here is shown on the page body; visible copy still comes only from source/.

// Canonical URL. Set SITE_URL in Vercel once the real domain is live.
export const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'https://copacetic-web-andrew-boyles-projects.vercel.app'
).replace(/\/$/, '');

// Social profiles. Paste the full URLs; empty ones are left out of the footer and schema.
export const SOCIAL = {
  linkedin: '', // e.g. https://www.linkedin.com/company/copacetic-web
  google: '', // Google Business Profile share link, e.g. https://g.page/r/XXXXXXXX
};

export const EMAIL = 'Andrew@copacetic.web';

// Per-page search metadata. Titles lead with the search phrase each page targets.
// Every claim is one the page itself makes.
export const SEO = {
  home: {
    title: 'Law Firm Web Design UK | Bespoke Solicitor Websites | copacetic.web',
    description: 'Bespoke websites for law firms, solicitors and legal tech. No Wix or WordPress templates. SRA-ready, mobile responsive, hosted on secure UK servers.',
  },
  services: {
    title: 'Web Design, Apps, AI & Branding for Law Firms | copacetic.web',
    description: 'Law firm web design, iOS & Android apps, AI chatbots, branding, SEO, social media, analytics and secure UK hosting, from one team.',
  },
  'web-design': {
    title: 'Bespoke Website Design, No Templates | copacetic.web',
    description: 'Custom websites designed from a blank page around your brand. No Wix or WordPress templates. Every site is a PWA, mobile responsive and SEO-ready.',
  },
  apps: {
    title: 'iOS & Android App Development for Law Firms | copacetic.web',
    description: 'Native iOS and Android apps for your firm, designed around your brand and published to the App Store and Google Play. Scoped and priced per project.',
  },
  ai: {
    title: 'AI Chatbots & AI Web Design for Law Firms | copacetic.web',
    description: 'An AI chatbot for your law firm website that answers common questions, captures enquiries and gives general information, not legal advice, in your firm’s voice.',
  },
  branding: {
    title: 'Branding for New Law Firms: Name, Logo & Identity | copacetic.web',
    description: 'Starting a law firm? We create your name, logo, colours and identity, then carry it through your website, social media and documents.',
  },
  solicitors: {
    title: 'Consultant Solicitor Websites & Profile Sites | copacetic.web',
    description: 'Personal websites for consultant solicitors and individual lawyers: your experience, practice areas, SRA details and how to instruct you.',
  },
  seo: {
    title: 'SEO for Law Firms & Solicitors | copacetic.web',
    description: 'Law firm SEO built into your site from the start: technical SEO, local search and content written around what your clients search for.',
  },
  social: {
    title: 'Social Media Management for Law Firms | copacetic.web',
    description: 'On-brand social media for law firms: a content calendar agreed in advance, designed posts, and channels managed for you.',
  },
  analytics: {
    title: 'Simple Website Analytics Reports for Law Firms | copacetic.web',
    description: 'No dashboards to learn. One plain-English report a month on the indicators you choose: enquiries, calls, bookings, top pages.',
  },
  hosting: {
    title: 'Secure UK Website Hosting for Law Firms | copacetic.web',
    description: 'Your website hosted on our own servers in a UK data centre, built to ISO 27001 standards, with SSL on every site. No site-builder platforms.',
  },
  legal: {
    title: 'SRA-Compliant Law Firm Websites | copacetic.web',
    description: 'Law firm websites with SRA information, the SRA digital badge, price transparency pages, complaints details, accessibility and UK GDPR-ready privacy built in.',
  },
  pricing: {
    title: 'Law Firm Website Packages & Pricing | copacetic.web',
    description: 'Essential, Professional and Bespoke website packages. Every package is bespoke design, a PWA, mobile responsive and hosted on our UK servers.',
  },
  clients: {
    title: 'Our Clients: Law Firm & Legal Tech Websites | copacetic.web',
    description: 'Companies we work with, from law firms and consultant solicitors to legal tech and independent businesses.',
  },
  about: {
    title: 'About Us: A Web Design Bureau for the Legal Sector | copacetic.web',
    description: 'We specialise in websites for law firms and legal tech start-ups, designed from scratch and hosted on our own secure UK servers.',
  },
  contact: {
    title: 'Contact Us: Start Your Law Firm Website | copacetic.web',
    description: 'Tell us about your project: web design, apps, AI chatbots, branding, solicitor profile sites, SEO, social media or hosting.',
  },
};

// Topics for the Organization schema (helps search engines understand what we do).
export const KNOWS_ABOUT = [
  'Law firm web design', 'Solicitor website design', 'Legal tech website design', 'AI chatbots for law firms',
  'Law firm branding', 'SRA Transparency Rules', 'SRA digital badge', 'Law firm SEO', 'Progressive Web Apps',
  'iOS app development', 'Android app development', 'UK website hosting',
];
