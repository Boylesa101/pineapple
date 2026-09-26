// Services covered by the SRA Transparency Rules. Firms offering these must publish price and
// service information (see https://www.sra.org.uk/solicitors/guidance/transparency-in-price-and-service/).
export const TRANSPARENCY_SERVICES = [
  { id: 'residential_conveyancing', label: 'Residential conveyancing (sale, purchase, mortgage, remortgage)' },
  { id: 'probate', label: 'Probate (uncontested, all assets in the UK)' },
  { id: 'motoring_offences', label: 'Motoring offences (summary only)' },
  { id: 'employment_claims', label: 'Employment tribunals: bringing unfair or wrongful dismissal claims' },
  { id: 'employment_defending', label: 'Employment tribunals: defending unfair or wrongful dismissal claims' },
  { id: 'immigration', label: 'Immigration (excluding asylum)' },
  { id: 'debt_recovery', label: 'Debt recovery (up to £100,000)' },
  { id: 'licensing', label: 'Licensing applications for business premises' },
] as const;

export type TransparencyServiceId = (typeof TRANSPARENCY_SERVICES)[number]['id'];
export const transparencyLabel = (id: string) => TRANSPARENCY_SERVICES.find((s) => s.id === id)?.label ?? id;
