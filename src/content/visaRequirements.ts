type VisaCountryConfig = {
  countryLabel: string;
  aliases: string[];
  officialUrl: string;
  officialSourceLabel: string;
  shortStayVisaLikelyRequiredFor: string[];
  shortStayVisaLikelyNotRequiredFor: string[];
};

export type VisaRequirementAssessment = {
  destinationCountry: string;
  officialUrl: string;
  officialSourceLabel: string;
  tone: 'warning' | 'prompt';
  title: string;
  body: string;
};

const visaCountryConfigs: VisaCountryConfig[] = [
  {
    countryLabel: 'United Kingdom',
    aliases: ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'northern ireland', 'britain', 'great britain'],
    officialUrl: 'https://www.gov.uk/check-uk-visa',
    officialSourceLabel: 'GOV.UK visa checker',
    shortStayVisaLikelyRequiredFor: ['IND', 'PAK', 'NGA', 'CHN'],
    shortStayVisaLikelyNotRequiredFor: ['GBR', 'USA', 'FRA', 'DEU', 'ESP', 'ITA'],
  },
  {
    countryLabel: 'France',
    aliases: ['france', 'paris', 'nice', 'marseille', 'lyon'],
    officialUrl: 'https://france-visas.gouv.fr/en/',
    officialSourceLabel: 'France-Visas',
    shortStayVisaLikelyRequiredFor: ['IND', 'PAK', 'NGA', 'CHN'],
    shortStayVisaLikelyNotRequiredFor: ['GBR', 'USA', 'FRA', 'DEU', 'ESP', 'ITA'],
  },
  {
    countryLabel: 'Spain',
    aliases: ['spain', 'madrid', 'barcelona', 'mallorca', 'ibiza', 'tenerife'],
    officialUrl: 'https://www.exteriores.gob.es/Embajadas/londres/en/ServiciosConsulares/Paginas/Consular/Visados.aspx',
    officialSourceLabel: 'Spanish Ministry of Foreign Affairs',
    shortStayVisaLikelyRequiredFor: ['IND', 'PAK', 'NGA', 'CHN'],
    shortStayVisaLikelyNotRequiredFor: ['GBR', 'USA', 'FRA', 'DEU', 'ESP', 'ITA'],
  },
  {
    countryLabel: 'Germany',
    aliases: ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg'],
    officialUrl: 'https://uk.diplo.de/uk-en/02/visa',
    officialSourceLabel: 'German Federal Foreign Office',
    shortStayVisaLikelyRequiredFor: ['IND', 'PAK', 'NGA', 'CHN'],
    shortStayVisaLikelyNotRequiredFor: ['GBR', 'USA', 'FRA', 'DEU', 'ESP', 'ITA'],
  },
  {
    countryLabel: 'Italy',
    aliases: ['italy', 'rome', 'milan', 'venice', 'florence', 'naples'],
    officialUrl: 'https://vistoperitalia.esteri.it/home/en',
    officialSourceLabel: 'vistoperlitalia',
    shortStayVisaLikelyRequiredFor: ['IND', 'PAK', 'NGA', 'CHN'],
    shortStayVisaLikelyNotRequiredFor: ['GBR', 'USA', 'FRA', 'DEU', 'ESP', 'ITA'],
  },
  {
    countryLabel: 'United States',
    aliases: ['united states', 'usa', 'new york', 'los angeles', 'miami', 'orlando', 'las vegas'],
    officialUrl: 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html',
    officialSourceLabel: 'U.S. Department of State',
    shortStayVisaLikelyRequiredFor: ['IND', 'PAK', 'NGA', 'CHN'],
    shortStayVisaLikelyNotRequiredFor: ['GBR', 'FRA', 'DEU', 'ESP', 'ITA'],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getVisaRequirementAssessment(destination: string, passportCountryCode?: string | null): VisaRequirementAssessment | null {
  const haystack = normalize(destination);
  const config = visaCountryConfigs.find((item) => item.aliases.some((alias) => haystack.includes(alias)));
  if (!config) {
    return null;
  }

  const passportCode = passportCountryCode?.trim().toUpperCase() || null;
  if (!passportCode) {
    return {
      destinationCountry: config.countryLabel,
      officialUrl: config.officialUrl,
      officialSourceLabel: config.officialSourceLabel,
      tone: 'prompt',
      title: `Check visa requirements for ${config.countryLabel}`,
      body: `Pineapple cannot confirm this traveller's passport nationality yet. Check the official ${config.countryLabel} immigration guidance before travel.`,
    };
  }

  if (config.shortStayVisaLikelyRequiredFor.includes(passportCode)) {
    return {
      destinationCountry: config.countryLabel,
      officialUrl: config.officialUrl,
      officialSourceLabel: config.officialSourceLabel,
      tone: 'warning',
      title: `Visa may be required for ${config.countryLabel}`,
      body: `Based on the saved passport country, this trip may need a visa or pre-travel authorisation. Check the official ${config.countryLabel} immigration guidance before booking or departure.`,
    };
  }

  if (!config.shortStayVisaLikelyNotRequiredFor.includes(passportCode)) {
    return {
      destinationCountry: config.countryLabel,
      officialUrl: config.officialUrl,
      officialSourceLabel: config.officialSourceLabel,
      tone: 'prompt',
      title: `Check visa requirements for ${config.countryLabel}`,
      body: `Pineapple cannot confirm the short-stay rule for the saved passport country with confidence. Check the official ${config.countryLabel} immigration guidance before travel.`,
    };
  }

  return {
    destinationCountry: config.countryLabel,
    officialUrl: config.officialUrl,
    officialSourceLabel: config.officialSourceLabel,
    tone: 'prompt',
    title: `Check entry requirements for ${config.countryLabel}`,
    body: `A short stay may not need a visa for this saved passport country, but entry rules still change. Check the official ${config.countryLabel} guidance before travel.`,
  };
}
