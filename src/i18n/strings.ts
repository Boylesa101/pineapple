import { defaultAppLanguage, type AppLanguage } from '@/i18n/config';

type TranslationValue = string;
type TranslationMap = Record<string, TranslationValue>;

const strings: Record<AppLanguage, TranslationMap> = {
  'en-GB': {
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.skipForNow': 'Skip for now',
    'home.greeting': 'Hello {{name}}',
    'home.currentTrip': 'Current trip',
    'home.viewAll': 'View all',
    'home.newTrip': 'New trip',
    'home.noTripYet': 'No trip yet',
    'home.noTripDescription': 'Create your first trip to unlock the live dashboard, document vault, and emergency travel tools.',
    'home.createFirstTrip': 'Create your first trip',
    'settings.title': 'Settings',
    'settings.subtitle': 'App preferences and controls',
    'settings.languageTitle': 'Language & region',
    'settings.languageDescription': 'Choose how Pineapple greets you and formats app dates. You can change this any time.',
    'onboarding.languageTitle': 'Choose your language',
    'onboarding.languageBody': 'Pick the language Pineapple should use first. Dates and key greetings will follow this choice, and you can change it later in Settings.',
  },
  'en-US': {
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.skipForNow': 'Skip for now',
    'home.greeting': 'Howdy {{name}}',
    'home.currentTrip': 'Current trip',
    'home.viewAll': 'View all',
    'home.newTrip': 'New trip',
    'home.noTripYet': 'No trip yet',
    'home.noTripDescription': 'Create your first trip to unlock the live dashboard, document vault, and emergency travel tools.',
    'home.createFirstTrip': 'Create your first trip',
    'settings.title': 'Settings',
    'settings.subtitle': 'App preferences and controls',
    'settings.languageTitle': 'Language & region',
    'settings.languageDescription': 'Choose how Pineapple greets you and formats app dates. You can change this any time.',
    'onboarding.languageTitle': 'Choose your language',
    'onboarding.languageBody': 'Pick the language Pineapple should use first. Dates and key greetings will follow this choice, and you can change it later in Settings.',
  },
  'fr-FR': {
    'common.continue': 'Continuer',
    'common.back': 'Retour',
    'common.skipForNow': 'Pas maintenant',
    'home.greeting': 'Bonjour {{name}}',
    'home.currentTrip': 'Voyage actuel',
    'home.viewAll': 'Tout voir',
    'home.newTrip': 'Nouveau voyage',
    'home.noTripYet': 'Aucun voyage',
    'home.noTripDescription': 'Créez votre premier voyage pour activer le tableau de bord, le coffre de documents et les outils d’urgence.',
    'home.createFirstTrip': 'Créer votre premier voyage',
    'settings.title': 'Réglages',
    'settings.subtitle': 'Préférences et contrôles',
    'settings.languageTitle': 'Langue et région',
    'settings.languageDescription': 'Choisissez la langue de Pineapple et le format des dates. Vous pouvez la modifier à tout moment.',
    'onboarding.languageTitle': 'Choisissez votre langue',
    'onboarding.languageBody': 'Choisissez la langue utilisée par Pineapple au départ. Les dates et les salutations principales suivront ce choix, et vous pourrez le modifier plus tard dans les réglages.',
  },
  'es-ES': {
    'common.continue': 'Continuar',
    'common.back': 'Atrás',
    'common.skipForNow': 'Ahora no',
    'home.greeting': 'Hola {{name}}',
    'home.currentTrip': 'Viaje actual',
    'home.viewAll': 'Ver todo',
    'home.newTrip': 'Nuevo viaje',
    'home.noTripYet': 'Todavía no hay viaje',
    'home.noTripDescription': 'Crea tu primer viaje para activar el panel, la bóveda de documentos y las herramientas de emergencia.',
    'home.createFirstTrip': 'Crear tu primer viaje',
    'settings.title': 'Ajustes',
    'settings.subtitle': 'Preferencias y controles',
    'settings.languageTitle': 'Idioma y región',
    'settings.languageDescription': 'Elige cómo te saluda Pineapple y cómo muestra las fechas. Puedes cambiarlo cuando quieras.',
    'onboarding.languageTitle': 'Elige tu idioma',
    'onboarding.languageBody': 'Selecciona primero el idioma que debe usar Pineapple. Las fechas y los saludos principales seguirán esta elección, y podrás cambiarla más tarde en Ajustes.',
  },
  'de-DE': {
    'common.continue': 'Weiter',
    'common.back': 'Zurück',
    'common.skipForNow': 'Später',
    'home.greeting': 'Hallo {{name}}',
    'home.currentTrip': 'Aktuelle Reise',
    'home.viewAll': 'Alle anzeigen',
    'home.newTrip': 'Neue Reise',
    'home.noTripYet': 'Noch keine Reise',
    'home.noTripDescription': 'Erstellen Sie Ihre erste Reise, um Dashboard, Dokumentenablage und Notfallfunktionen freizuschalten.',
    'home.createFirstTrip': 'Erste Reise erstellen',
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'App-Einstellungen und Steuerung',
    'settings.languageTitle': 'Sprache und Region',
    'settings.languageDescription': 'Wählen Sie Sprache und Datumsformat von Pineapple. Das können Sie jederzeit ändern.',
    'onboarding.languageTitle': 'Sprache wählen',
    'onboarding.languageBody': 'Wählen Sie zuerst die Sprache für Pineapple. Datumsangaben und zentrale Begrüßungen folgen dieser Auswahl und lassen sich später in den Einstellungen ändern.',
  },
  'it-IT': {
    'common.continue': 'Continua',
    'common.back': 'Indietro',
    'common.skipForNow': 'Non ora',
    'home.greeting': 'Ciao {{name}}',
    'home.currentTrip': 'Viaggio attuale',
    'home.viewAll': 'Vedi tutto',
    'home.newTrip': 'Nuovo viaggio',
    'home.noTripYet': 'Nessun viaggio',
    'home.noTripDescription': 'Crea il tuo primo viaggio per attivare dashboard, archivio documenti e strumenti di emergenza.',
    'home.createFirstTrip': 'Crea il tuo primo viaggio',
    'settings.title': 'Impostazioni',
    'settings.subtitle': 'Preferenze e controlli dell’app',
    'settings.languageTitle': 'Lingua e area',
    'settings.languageDescription': 'Scegli come Pineapple ti saluta e formatta le date. Puoi cambiarlo in qualsiasi momento.',
    'onboarding.languageTitle': 'Scegli la tua lingua',
    'onboarding.languageBody': 'Scegli la lingua iniziale di Pineapple. Le date e i saluti principali seguiranno questa scelta, e potrai modificarla più tardi nelle Impostazioni.',
  },
};

export type TranslationKey = keyof typeof strings['en-GB'];

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

export function translate(language: AppLanguage, key: TranslationKey, values?: Record<string, string | number>) {
  const fallback = strings[defaultAppLanguage][key] ?? key;
  const template = strings[language][key] ?? fallback;
  return interpolate(template, values);
}
