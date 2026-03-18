export interface OpCo {
  id: string;
  name: string;
}

export interface CompanyGroup {
  id: string;
  name: string;
  opcos: OpCo[];
}

export const COMPANIES: CompanyGroup[] = [
  {
    id: 'national-grid',
    name: 'National Grid',
    opcos: [
      { id: 'ng-ma', name: 'National Grid Massachusetts (MECO/Boston Gas)' },
      { id: 'ng-ny', name: 'National Grid New York (KEDNY/KEDLI/Niagara Mohawk)' },
    ]
  },
  {
    id: 'eversource',
    name: 'Eversource',
    opcos: [
      { id: 'es-ct', name: 'Eversource Connecticut (CL&P/Yankee Gas)' },
      { id: 'es-ma', name: 'Eversource Massachusetts (NSTAR/WMECO)' },
      { id: 'es-nh', name: 'Eversource New Hampshire (PSNH)' },
    ]
  },
  {
    id: 'con-edison',
    name: 'Con Edison',
    opcos: [
      { id: 'cecony', name: 'Con Edison of New York (CECONY)' },
      { id: 'o-and-r', name: 'Orange & Rockland (O&R)' },
    ]
  },
  {
    id: 'pge',
    name: 'PG&E',
    opcos: [
      { id: 'pge-opco', name: 'Pacific Gas and Electric Company' }
    ]
  },
  {
    id: 'duke-energy',
    name: 'Duke Energy',
    opcos: [
      { id: 'duke-carolinas', name: 'Duke Energy Carolinas' },
      { id: 'duke-progress', name: 'Duke Energy Progress' },
      { id: 'duke-florida', name: 'Duke Energy Florida' },
      { id: 'duke-midwest', name: 'Duke Energy Indiana/Ohio/Kentucky' },
    ]
  },
  {
    id: 'southern-company',
    name: 'Southern Company',
    opcos: [
      { id: 'georgia-power', name: 'Georgia Power' },
      { id: 'alabama-power', name: 'Alabama Power' },
      { id: 'mississippi-power', name: 'Mississippi Power' },
    ]
  },
  {
    id: 'nextera',
    name: 'NextEra Energy',
    opcos: [
      { id: 'fpl', name: 'Florida Power & Light (FPL)' },
      { id: 'neer', name: 'NextEra Energy Resources (NEER)' },
    ]
  },
  {
    id: 'avangrid',
    name: 'Avangrid',
    opcos: [
      { id: 'nyseg', name: 'New York State Electric & Gas (NYSEG)' },
      { id: 'rge', name: 'Rochester Gas and Electric (RG&E)' },
      { id: 'cmp', name: 'Central Maine Power (CMP)' },
      { id: 'ui', name: 'United Illuminating (UI)' },
      { id: 'berkshire', name: 'Berkshire Gas' },
      { id: 'cng', name: 'Connecticut Natural Gas (CNG)' },
      { id: 'scg', name: 'Southern Connecticut Gas (SCG)' },
      { id: 'mng', name: 'Maine Natural Gas' },
    ]
  }
];
