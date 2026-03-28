import { Building2, Loader2, CheckSquare, Square, LogOut, User, BellRing, MessageSquareText, ChevronRight, Search, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { CompanyGroup } from '../data/companies';
import wintelLogo from '../assets/wintel-logo-mark.svg';

interface FunctionArea {
  id: string;
  name: string;
}

interface SidebarProps {
  selectedView: 'account' | 'dockets';
  onSelectView: (view: 'account' | 'dockets') => void;
  companyGroups: CompanyGroup[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string | null) => void;
  selectedOpCos: string[];
  onToggleOpCo: (id: string) => void;
  functions: FunctionArea[];
  selectedFunctions: string[];
  onToggleFunction: (id: string) => void;
  selectedYear: number | null;
  onSelectYear: (year: number | null) => void;
  userProfile: string;
  onChangeUserProfile: (profile: string) => void;
  onGenerate: () => void;
  loading: boolean;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export function Sidebar({
  selectedView,
  onSelectView,
  companyGroups,
  selectedCompanyId,
  onSelectCompany,
  selectedOpCos,
  onToggleOpCo,
  functions,
  selectedFunctions,
  onToggleFunction,
  selectedYear,
  onSelectYear,
  userProfile,
  onChangeUserProfile,
  onGenerate,
  loading,
  userName,
  userEmail,
  onLogout
}: SidebarProps) {
  const selectedCompany = companyGroups.find(c => c.id === selectedCompanyId);
  const [companySearch, setCompanySearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    opcos: true,
    functions: true,
    timeline: false,
    persona: false,
  });

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companyGroups;
    const q = companySearch.toLowerCase();
    return companyGroups.filter(g => g.name.toLowerCase().includes(q));
  }, [companyGroups, companySearch]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = selectedFunctions.length;
  const opcoCount = selectedOpCos.length;

  return (
    <aside className="w-[272px] bg-brand-navy border-r border-brand-navy flex flex-col h-full flex-shrink-0 text-white">
      {/* Brand header */}
      <div className="px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden bg-white/8 flex items-center justify-center shadow-lg shadow-black/20">
            <img src={wintelLogo} alt="Wintel" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block leading-tight">WINTEL</span>
            <span className="text-[10px] text-white/40 leading-tight">Market Insights for Account Teams</span>
          </div>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pt-3 pb-1">
        <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
          Workspace
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectView('account')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all ${
              selectedView === 'account'
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-white/60 hover:bg-white/6 hover:text-white/80'
            }`}
          >
            <MessageSquareText className={`h-4 w-4 ${selectedView === 'account' ? 'text-brand-magenta' : 'text-white/40'}`} />
            Account Planner
          </button>
          <button
            onClick={() => onSelectView('dockets')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all ${
              selectedView === 'dockets'
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-white/60 hover:bg-white/6 hover:text-white/80'
            }`}
          >
            <BellRing className={`h-4 w-4 ${selectedView === 'dockets' ? 'text-brand-magenta' : 'text-white/40'}`} />
            Docket Watch
          </button>
        </div>
      </div>

      {/* Configuration — scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1">
        <div className={`transition-opacity duration-300 ${selectedView === 'account' ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>

          {/* Company Selection */}
          <div className="mb-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.18em]">
                Target Company
              </p>
              {selectedCompanyId && (
                <button
                  onClick={() => onSelectCompany(null)}
                  className="text-[10px] text-brand-magenta hover:text-brand-magenta-dark font-semibold transition-colors"
                >
                  Change
                </button>
              )}
            </div>

            {!selectedCompanyId ? (
              <div className="space-y-1.5">
                {/* Search */}
                <div className="relative px-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Search companies..."
                    className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-brand-magenta/40 transition-colors"
                  />
                </div>
                <div className="space-y-0.5 px-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                  {filteredCompanies.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => { onSelectCompany(group.id); setCompanySearch(''); }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-transparent bg-white/4 hover:bg-white/8 hover:border-white/10 transition-all text-left group"
                    >
                      <div className="w-7 h-7 rounded-md bg-white/8 flex items-center justify-center group-hover:bg-brand-magenta/15 transition-colors flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-white/50 group-hover:text-brand-magenta transition-colors" />
                      </div>
                      <span className="text-[12px] font-medium leading-tight text-white/80 group-hover:text-white transition-colors">{group.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-1">
                {/* Active target badge */}
                <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-brand-magenta/20 bg-brand-magenta/8 p-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-magenta flex items-center justify-center shadow-lg shadow-brand-magenta/20 flex-shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-brand-magenta uppercase tracking-wider leading-tight">Active Target</p>
                    <h4 className="text-[13px] font-bold text-white leading-tight truncate">{selectedCompany?.name}</h4>
                  </div>
                </div>

                {/* OpCo Selection — collapsible */}
                <CollapsibleSection
                  label="Operating Companies"
                  badge={opcoCount > 0 ? `${opcoCount}` : undefined}
                  isOpen={expandedSections.opcos}
                  onToggle={() => toggleSection('opcos')}
                >
                  <div className="space-y-0.5">
                    {selectedCompany?.opcos.map((opco) => {
                      const isSelected = selectedOpCos.includes(opco.id);
                      return (
                        <button
                          key={opco.id}
                          onClick={() => onToggleOpCo(opco.id)}
                          className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                            isSelected
                              ? 'bg-brand-magenta/15 text-white'
                              : 'text-white/60 hover:bg-white/6 hover:text-white/80'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-brand-magenta" /> : <Square className="w-3.5 h-3.5 text-white/30" />}
                          </div>
                          <span className="text-left leading-tight">{opco.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </div>

          {/* Functional Areas — collapsible */}
          <div className={`transition-opacity duration-200 ${!selectedCompanyId ? 'opacity-25 pointer-events-none' : ''}`}>
            <CollapsibleSection
              label="Functional Areas"
              badge={selectedCount > 0 ? `${selectedCount}` : undefined}
              isOpen={expandedSections.functions}
              onToggle={() => toggleSection('functions')}
            >
              <div className="space-y-0.5">
                {functions.map((func) => {
                  const isSelected = selectedFunctions.includes(func.id);
                  return (
                    <button
                      key={func.id}
                      onClick={() => onToggleFunction(func.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                        isSelected
                          ? 'bg-brand-magenta/15 text-white'
                          : 'text-white/60 hover:bg-white/6 hover:text-white/80'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-brand-magenta" /> : <Square className="w-3.5 h-3.5 text-white/30" />}
                      {func.name}
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>
          </div>

          {/* Timeline Year — collapsible */}
          <div className={`transition-opacity duration-200 ${!selectedCompanyId ? 'opacity-25 pointer-events-none' : ''}`}>
            <CollapsibleSection
              label="Timeline Year"
              badge={selectedYear ? `${selectedYear}` : undefined}
              isOpen={expandedSections.timeline}
              onToggle={() => toggleSection('timeline')}
            >
              <div className="px-1">
                <select
                  value={selectedYear || ''}
                  onChange={(e) => onSelectYear(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-brand-magenta/40 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-brand-navy text-white">Next 5 Years (Default)</option>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <option key={year} value={year} className="bg-brand-navy text-white">
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </CollapsibleSection>
          </div>

          {/* Persona — collapsible */}
          <div className={`transition-opacity duration-200 ${!selectedCompanyId ? 'opacity-25 pointer-events-none' : ''}`}>
            <CollapsibleSection
              label="Your Persona"
              badge={userProfile.trim() ? 'Set' : undefined}
              isOpen={expandedSections.persona}
              onToggle={() => toggleSection('persona')}
            >
              <div className="px-1">
                <textarea
                  value={userProfile}
                  onChange={(e) => onChangeUserProfile(e.target.value)}
                  placeholder="e.g., Cloud Architect specializing in Azure..."
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:outline-none focus:border-brand-magenta/40 transition-colors resize-none h-16"
                />
                <p className="text-[10px] text-white/30 mt-1.5 leading-snug">
                  Tailors insights and language to your expertise.
                </p>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Footer: generate + user */}
      <div className="p-3 border-t border-white/8 space-y-2">
        <button
          onClick={onGenerate}
          disabled={loading || !selectedCompanyId}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-magenta to-brand-magenta-dark hover:from-brand-magenta-dark hover:to-brand-magenta text-white px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-magenta/20 active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate Intel Report
        </button>

        {/* User card */}
        <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/4 p-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8 flex-shrink-0">
            <User className="h-3.5 w-3.5 text-white/60" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white/85 leading-tight">{userName}</p>
            <p className="truncate text-[10px] text-white/40 leading-tight">{userEmail}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/8 hover:text-white/70 flex-shrink-0"
            title="Log Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* Reusable collapsible section for sidebar */
function CollapsibleSection({
  label,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-2 py-2 rounded-md text-left hover:bg-white/4 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-3 w-3 text-white/30 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 group-hover:text-white/55 transition-colors">
            {label}
          </span>
        </div>
        {badge && (
          <span className="rounded-full bg-brand-magenta/20 px-2 py-0.5 text-[9px] font-bold text-brand-magenta">
            {badge}
          </span>
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pb-1 pt-0.5">{children}</div>
      </div>
    </div>
  );
}
