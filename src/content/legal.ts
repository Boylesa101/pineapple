// Replace these placeholder emails and URLs before production release.
// This file is the single source of truth for Pineapple's app and website legal wording.
// Keep this aligned with the actual shipped app behavior. Do not overstate security,
// location usage, analytics, or cloud capabilities if the code does not support them.

export type ContentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type FAQItem = {
  question: string;
  answer: string;
};

export const legalConfig = {
  appName: 'Pineapple',
  tagline: 'Your travel essentials in one secure place — even offline.',
  supportEmail: 'support@pineappleapp.example',
  privacyEmail: 'privacy@pineappleapp.example',
  websiteUrl: 'https://get-pineapple.pages.dev',
  privacyPolicyUrl: 'https://get-pineapple.pages.dev/privacy',
  termsUrl: 'https://get-pineapple.pages.dev/terms',
  supportUrl: 'https://get-pineapple.pages.dev/support',
  futurePlayStoreUrl: '#',
  versionPlaceholder: 'Use the current app version here before release.',
  releaseLabel: 'First public release candidate',
  developerName: 'Pineapple App',
  copyrightName: 'Pineapple App',
  smallPrint:
    'Pineapple is an independent travel companion app and is not affiliated with any government authority.',
} as const;

export const privacySummaryBullets = [
  'Your travel documents and trip details are designed to stay on your device.',
  'Pineapple does not require an account for basic use in the current release.',
  'Pineapple uses local notifications for reminders when you turn them on.',
  'The current audited release does not continuously track your location.',
] as const;

export const homeHighlights = [
  {
    icon: 'shield_lock',
    title: 'Travel documents kept together',
    body: 'Keep passports, driving licences, health cards, booking details, and supporting travel paperwork in one place on your device.',
  },
  {
    icon: 'offline_bolt',
    title: 'Built for offline access',
    body: 'Core travel details stay available even when signal is weak, roaming is off, or airport Wi-Fi is unreliable.',
  },
  {
    icon: 'event_available',
    title: 'Expiry and travel reminders',
    body: 'Pineapple can schedule local reminders for passport expiry, trip days, check-in timing, hotel check-in, and transfer prompts.',
  },
  {
    icon: 'sos',
    title: 'SOS travel support',
    body: 'Emergency notes and key support details are designed to stay close at hand when a trip takes an unexpected turn.',
  },
] as const;

export const featureGroups = [
  {
    title: 'Travel docs, trips, and SOS in one flow',
    body: 'Pineapple is not a generic holiday-planner. It is built around the reality of travel documents, trip details, reminders, and emergency access living together.',
    items: [
      'Passport-style and card-style document views',
      'Trip planning with flights, hotels, transfers, packing, and itinerary details',
      'SOS and emergency travel information kept easy to reach',
    ],
  },
  {
    title: 'Privacy-first and local-first by default',
    body: 'The current audited release is designed so your core data lives on your device. Pineapple does not require an account for basic use.',
    items: [
      'No mandatory sign-up for first release',
      'No ads in the current audited release',
      'No analytics or crash-reporting SDKs found in the current audited release',
    ],
  },
  {
    title: 'Useful when you are actually travelling',
    body: 'The product is built around departure dates, check-in timing, expiry pressure, and the need to find important information quickly.',
    items: [
      'Travel-day and document reminders',
      'Quick access to trip sections and document details',
      'Readable, phone-first design instead of dense forms everywhere',
    ],
  },
] as const;

export const whyPineappleSections: ContentSection[] = [
  {
    heading: 'Why Pineapple feels different',
    paragraphs: [
      'Pineapple is designed around travel stress points: documents expiring, bookings spread across apps, and emergency details being hard to find when you need them most.',
      'Instead of treating travel like a social feed or a booking marketplace, Pineapple keeps the focus on readiness, access, and clarity.',
    ],
  },
  {
    heading: 'Works offline where it matters',
    paragraphs: [
      'Your core travel records, document entries, and trip details are designed to remain available on the device. That matters when you are in transit, roaming is expensive, or the network is unstable.',
      'Some optional lookups, such as destination imagery, hotel or address search, or Vibes suggestions, depend on a network connection when you use those features.',
    ],
  },
];

export const aboutSections: ContentSection[] = [
  {
    heading: 'What Pineapple is',
    paragraphs: [
      'Pineapple is a privacy-aware travel companion app for keeping travel documents, trip details, reminders, and SOS travel support close at hand.',
      'It is built around local-first use so your core travel information can stay accessible on the device even when signal is unreliable.',
    ],
  },
  {
    heading: 'What Pineapple is not',
    paragraphs: [
      'Pineapple is not a booking site, not a government service, and not a substitute for checking official travel requirements yourself.',
      'It helps you stay organised, but you remain responsible for passports, visas, bookings, and official entry rules.',
    ],
  },
];

export const privacySections: ContentSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `${legalConfig.appName} is a travel companion app published by ${legalConfig.developerName}. This Privacy Policy explains how the current release handles information.`,
      `If you have privacy questions, contact ${legalConfig.privacyEmail}. Replace this placeholder email before release.`,
    ],
  },
  {
    heading: 'What Pineapple is for',
    paragraphs: [
      'Pineapple helps you store travel documents, organise trips, view reminders, and keep emergency travel information easy to reach.',
      'The current release is designed around local-first use. Core travel data stays on the device, although some optional lookups need an internet connection when you choose to use them.',
    ],
  },
  {
    heading: 'What Pineapple stores on your device',
    paragraphs: [
      'The app may store travel documents, scanned document images, OCR results, trip details, traveller profiles, itinerary items, hotel details, transfer details, packing lists, and local reminder settings on your device.',
      'If you import or capture a travel document image, Pineapple stores that file locally so it can be viewed again later inside the app.',
    ],
    bullets: [
      'Passport and other travel document details',
      'Trip dates, destinations, flights, hotels, transfers, and itinerary notes',
      'Profile name and optional profile photo',
      'Local backup files that you choose to create',
    ],
  },
  {
    heading: 'What Pineapple does not require at launch',
    paragraphs: [
      'The current audited release does not require you to create an account for basic use.',
      'The current audited release does not include advertising SDKs, and no analytics or crash-reporting SDKs were found in the audited app code at the time this draft was written.',
    ],
  },
  {
    heading: 'Permissions Pineapple may request',
    paragraphs: [
      'Pineapple may ask for camera or photo-library access when you choose to scan or import documents.',
      'Pineapple may ask for notification permission if you turn on local reminders.',
      'The current audited release does not continuously track your location and does not request background location access. If Pineapple later adds a nearby SOS or location-based help feature, the app should ask first at the point of use.',
    ],
  },
  {
    heading: 'When information may leave your device',
    paragraphs: [
      'Pineapple is local-first, but some optional features can contact third-party services when you choose to use them.',
      'Examples found in the current audited release include destination image lookup, hotel and address search, and Vibes or place suggestions. These features may send the search text or destination details needed to fetch results. This is not the same as account-based cloud sync.',
    ],
    bullets: [
      'Destination and hotel image lookup may use services such as Pexels or Wikimedia Commons',
      'Hotel and address search may use OpenStreetMap or Nominatim-style lookup services',
      'Vibes or place suggestions may use TripAdvisor through Pineapple-managed Cloudflare infrastructure',
    ],
  },
  {
    heading: 'Reminders and notifications',
    paragraphs: [
      'If you enable reminders, Pineapple schedules local notifications on your device. These notifications are intended for travel document expiry, trip-day timing, hotel reminders, transfer reminders, and similar travel prompts.',
      'Reminder text is designed to stay privacy-aware and should not include full document contents or document numbers.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'Pineapple includes app-locking, PIN support, optional biometrics where available, and additional protections for sensitive files and fields in parts of the app.',
      'No mobile app can promise perfect security. Pineapple is designed to reduce risk, but you should still keep your device protected and review what you store on it.',
    ],
  },
  {
    heading: 'Retention and deletion',
    paragraphs: [
      'Your data stays on your device unless you choose to export or share it through a Pineapple feature that sends or writes data elsewhere.',
      'You can delete records from inside Pineapple. Removing the app from your device may also remove locally stored data, subject to device backup behavior and any files you exported yourself.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'Pineapple is not directed to children. If a parent or guardian believes a child has stored personal information in the app inappropriately, remove the app data from the device and contact the support address if needed.',
    ],
  },
  {
    heading: 'Updates to this policy',
    paragraphs: [
      'We may update this Privacy Policy as Pineapple changes. When we do, we will update the wording in the app and on the public website.',
      `Questions about this policy can be sent to ${legalConfig.privacyEmail}.`,
    ],
  },
];

export const termsSections: ContentSection[] = [
  {
    heading: 'Using Pineapple',
    paragraphs: [
      `${legalConfig.appName} is provided as-is and as available. We aim to make it useful and reliable, but we do not guarantee that every feature will always be available, error-free, or suitable for every trip.`,
      'Pineapple helps organise travel information, but it does not replace your own responsibility to check passport validity, visas, official travel rules, entry requirements, insurance terms, or transport details.',
    ],
  },
  {
    heading: 'Travel responsibility stays with the user',
    paragraphs: [
      'You remain responsible for checking official travel requirements and making sure the information you rely on is current and accurate.',
      'Emergency or SOS information may depend on public or third-party sources and may not always be complete, current, or suitable for your specific circumstances.',
    ],
  },
  {
    heading: 'No government affiliation',
    paragraphs: [
      'Pineapple is an independent travel companion app. It is not affiliated with any government authority, border agency, embassy, airline, or health authority.',
    ],
  },
  {
    heading: 'Accounts, storage, and exported data',
    paragraphs: [
      'The current release of Pineapple does not require an account for basic use. If account-based features are added later, those features may have additional terms.',
      'You are responsible for the accuracy of the data you enter and for the handling of any backups, exports, or shared files you create from Pineapple.',
    ],
  },
  {
    heading: 'Intellectual property',
    paragraphs: [
      'The Pineapple name, branding, site copy, app design, and original software are owned by Pineapple App unless another owner is stated.',
      'Third-party names, logos, and content remain the property of their respective owners.',
    ],
  },
  {
    heading: 'Limitation of liability',
    paragraphs: [
      'To the fullest extent allowed by law, Pineapple App is not liable for indirect, incidental, special, consequential, or similar losses that arise from use of the app or website.',
      'That includes missed travel, expired documents, booking errors, emergency issues, or reliance on information that is incomplete, delayed, or no longer current.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update the app, website, and these terms over time. Continued use after an update means you accept the updated version.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      `For support questions, contact ${legalConfig.supportEmail}. Replace this placeholder email before release.`,
    ],
  },
];

export const supportIntroSections: ContentSection[] = [
  {
    heading: 'Need help with Pineapple?',
    paragraphs: [
      'Use this page for app support, store-reviewer references, and launch-readiness contact details.',
      `Support contact: ${legalConfig.supportEmail}. Replace this placeholder email before release.`,
    ],
  },
];

export const supportFaqs: FAQItem[] = [
  {
    question: 'How do I add a travel document?',
    answer:
      'Open Vault, tap the add button, and choose the document type or scan or import option you want. The onboarding flow can also add a passport before first unlock.',
  },
  {
    question: 'Does Pineapple work offline?',
    answer:
      'Core trip details, saved documents, and local reminders are designed to stay available on the device. Some optional lookups, such as destination imagery or place suggestions, need a network connection when you use them.',
  },
  {
    question: 'Is my data stored on my phone?',
    answer:
      'In the current audited release, Pineapple is designed as a local-first app. Your core travel records stay on your device unless you choose to export, share, or use a feature that contacts a third-party lookup service.',
  },
  {
    question: 'How do reminders work?',
    answer:
      'When reminders are enabled, Pineapple schedules local notifications on your device for supported document expiry and selected trip reminders.',
  },
  {
    question: 'Does Pineapple collect my personal information?',
    answer:
      'Pineapple does not require an account for basic use in the current release. Some optional lookup features can send the text you enter to third-party services needed to return those results.',
  },
  {
    question: 'When does Pineapple use my location?',
    answer:
      'The current audited release does not continuously track your location. If a future nearby SOS feature is added, Pineapple should ask at the point of use.',
  },
  {
    question: 'How do I get help?',
    answer:
      `Email ${legalConfig.supportEmail} with a short description of the issue, your device model, and the app version you are using.`,
  },
];

export const releaseChecklist = [
  'Replace placeholder support and privacy email addresses.',
  'Confirm the final pages.dev or custom domain URLs in legalConfig.',
  'Update the Google Play link on the website when the listing is live.',
  'Verify whether analytics, crash reporting, or any new SDKs have been added since this draft.',
  'Recheck what data leaves the device for third-party lookups and keep the policy wording aligned.',
  'Confirm the privacy policy link is live and visible in both the app and the website.',
  'Confirm Google Play Data safety answers against the actual shipped build.',
  'Review SOS wording and any location-related copy before release if nearby help features are added.',
] as const;
