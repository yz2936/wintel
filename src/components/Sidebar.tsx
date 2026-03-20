import { Zap, Building2, Loader2, CheckSquare, Square, LogOut, User, BellRing, MessageSquareText } from 'lucide-react';
import { CompanyGroup } from '../data/companies';

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

  return (
    <aside className="w-[272px] bg-brand-navy border-r border-brand-navy flex flex-col h-full flex-shrink-0 text-white">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand-magenta rounded-md flex items-center justify-center text-white">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Wintel</span>
        </div>
      </div>
      
      <div className="p-3 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
        <div className="space-y-2">
          <h3 className="px-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Workspaces
          </h3>
          <div className="space-y-1 px-1">
            <button
              onClick={() => onSelectView('account')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                selectedView === 'account' ? 'bg-brand-magenta/20 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <MessageSquareText className={`h-4 w-4 ${selectedView === 'account' ? 'text-brand-magenta' : 'text-white/50'}`} />
              Account Planner
            </button>
            <button
              onClick={() => onSelectView('dockets')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                selectedView === 'dockets' ? 'bg-brand-magenta/20 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <BellRing className={`h-4 w-4 ${selectedView === 'dockets' ? 'text-brand-magenta' : 'text-white/50'}`} />
              Docket Watch
            </button>
          </div>
        </div>

        {/* Step 1: Company Selection */}
        <div className={`space-y-3 transition-opacity duration-300 ${selectedView === 'account' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              1. Select Target Company
            </h3>
            {selectedCompanyId && (
              <button 
                onClick={() => onSelectCompany(null)}
                className="text-[10px] text-brand-magenta hover:underline font-bold uppercase"
              >
                Change
              </button>
            )}
          </div>

          {!selectedCompanyId ? (
            <div className="grid gap-1.5 px-1">
              {companyGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onSelectCompany(group.id)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-brand-magenta/50 transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center group-hover:bg-brand-magenta/20 transition-colors">
                    <Building2 className="w-3.5 h-3.5 text-white/60 group-hover:text-brand-magenta" />
                  </div>
                  <span className="text-[13px] font-medium leading-5 text-white/90">{group.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-1">
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand-magenta/30 bg-brand-magenta/10 p-3 animate-pulse-subtle">
                <div className="w-8 h-8 rounded-md bg-brand-magenta flex items-center justify-center shadow-lg shadow-brand-magenta/20">
                  <Building2 className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-magenta uppercase tracking-wider">Active Target</p>
                  <h4 className="text-sm font-bold text-white leading-tight">{selectedCompany?.name}</h4>
                </div>
              </div>

              {/* Step 2: OpCo Selection (Optional) */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">
                  2. Specific OpCos (Optional)
                </h3>
                <div className="space-y-0.5 pl-1">
                  {selectedCompany?.opcos.map((opco) => {
                    const isSelected = selectedOpCos.includes(opco.id);
                    return (
                      <button
                        key={opco.id}
                        onClick={() => onToggleOpCo(opco.id)}
                        className={`w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-brand-magenta/20 text-white'
                            : 'text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-brand-magenta" /> : <Square className="w-3.5 h-3.5 text-white/50" />}
                        </div>
                        <span className="text-left leading-tight">{opco.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Functions Section */}
        <div className={`space-y-3 transition-opacity duration-300 ${!selectedCompanyId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">
            3. Functional Areas
          </h3>
          <div className="space-y-0.5 px-1">
            {functions.map((func) => {
              const isSelected = selectedFunctions.includes(func.id);
              return (
                <button
                  key={func.id}
                  onClick={() => onToggleFunction(func.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-brand-magenta/20 text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-brand-magenta" /> : <Square className="w-3.5 h-3.5 text-white/50" />}
                  {func.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Timeline Section */}
        <div className={`space-y-3 transition-opacity duration-300 ${!selectedCompanyId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">
            4. Timeline Year (Optional)
          </h3>
          <div className="px-2">
            <select
              value={selectedYear || ''}
              onChange={(e) => onSelectYear(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[13px] text-white focus:outline-none focus:border-brand-magenta transition-colors appearance-none"
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
        </div>

        {/* Step 5: Persona Section */}
        <div className={`space-y-3 transition-opacity duration-300 ${!selectedCompanyId ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">
            5. Your Persona & Skillset
          </h3>
          <div className="px-2">
            <textarea
              value={userProfile}
              onChange={(e) => onChangeUserProfile(e.target.value)}
              placeholder="e.g., Cloud Architect specializing in Azure, or Financial Strategist..."
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-brand-magenta transition-colors resize-none h-18"
            />
            <p className="text-[10px] text-white/40 mt-2 leading-tight">
              The AI will tailor the storyline, insights, and language to match your specific expertise.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={onGenerate}
          disabled={loading || !selectedCompanyId}
          className="w-full flex items-center justify-center gap-2 bg-brand-magenta hover:bg-brand-magenta-dark text-white px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Generate Intel Report
        </button>
        <div className="rounded-md border border-white/8 bg-white/4 p-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8">
              <User className="h-3.5 w-3.5 text-white/70" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/88">{userName}</p>
              <p className="truncate text-[10px] text-white/45">{userEmail}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-medium text-white/65 transition-all duration-200 hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
