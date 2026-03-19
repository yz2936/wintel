import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { fetchFocusSummary, fetchNews, fetchPlanOfAttack, Contact, KeywordInsight } from './services/gemini';
import { login, logout, register, restoreSession, saveUserState, AuthUser, PersistedState } from './services/auth';
import { fetchDocketWatchEvents, runDocketWatchSync, type DocketWatchEvent, type DocketWatchSubscription, type DocketWatchTarget } from './services/dockets';
import {
  AlertCircle,
  BellRing,
  BriefcaseBusiness,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock3,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Linkedin,
  Loader2,
  Menu,
  MessageSquare,
  Paperclip,
  RadioTower,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  UserPlus,
  UsersRound,
  WandSparkles,
  X
} from 'lucide-react';
import { COMPANIES } from './data/companies';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FUNCTIONS = [
  { id: 'technology', name: 'Technology' },
  { id: 'regulatory', name: 'Regulatory' },
  { id: 'customer', name: 'Customer' },
  { id: 'financials', name: 'Financials' },
  { id: 'infrastructure', name: 'Infrastructure' }
];

const QUICK_CHAT_TEMPLATES = [
  {
    label: 'Recency',
    detail: 'What changed most recently',
    icon: Clock3,
    build: (company: string) => `What is the most recent material news for ${company}, and why does it matter right now for account planning?`
  },
  {
    label: 'Opportunities',
    detail: 'Commercial openings and signals',
    icon: BriefcaseBusiness,
    build: (company: string) => `What insights and near-term commercial opportunities are emerging at ${company} based on the latest developments?`
  },
  {
    label: 'Stakeholders',
    detail: 'Who is implicated in the news',
    icon: UsersRound,
    build: (company: string) => `Which client stakeholders are most relevant to the latest developments at ${company}, and why would each care right now?`
  },
  {
    label: 'Attack Strategy',
    detail: 'Talking points and next steps',
    icon: Target,
    build: (company: string) => `Based on the latest developments at ${company}, what talking points and attack strategy should I use in outreach and meetings?`
  }
];

const PRIORITY_TILES = [
  {
    title: 'Recency of Affairs',
    subtitle: 'What changed most recently and what is materially new',
    icon: Clock3
  },
  {
    title: 'Insights & Opportunities',
    subtitle: 'Where the buying motion, pressure, and commercial opening live',
    icon: BriefcaseBusiness
  },
  {
    title: 'Key Client Stakeholders',
    subtitle: 'Who is implicated in the news and why they matter',
    icon: UsersRound
  },
  {
    title: 'Talking Points & Attack Strategy',
    subtitle: 'How to show up with a sharper point of view',
    icon: Target
  }
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'report';
  data?: any;
  timestamp: Date;
  contacts?: Contact[];
  keywords?: KeywordInsight[];
}

const defaultAppState = (): PersistedState => ({
  selectedCompanyId: null,
  selectedOpCos: [],
  selectedFunctions: [],
  selectedYear: null,
  userProfile: '',
  customQuestions: [],
  messages: []
});

function KeywordTooltip({ term, keywords, children, groundingChunks }: { term: string; keywords?: KeywordInsight[]; children: React.ReactNode; groundingChunks?: any[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const insight = keywords?.find((keyword) => {
    const cleanTerm = term.replace(/\*/g, '').toLowerCase();
    const cleanKeyword = keyword.term.replace(/\*/g, '').toLowerCase();
    return cleanKeyword.includes(cleanTerm) || cleanTerm.includes(cleanKeyword);
  });

  if (!insight) {
    return <strong className="font-bold text-brand-navy">{children}</strong>;
  }

  let finalUrl = insight.sourceUrl;
  if (!finalUrl || finalUrl.length < 15) {
    const matchingChunk = groundingChunks?.find((chunk) =>
      chunk.web?.title?.toLowerCase().includes(term.toLowerCase()) ||
      chunk.web?.uri?.toLowerCase().includes(term.toLowerCase().replace(/\s+/g, '-'))
    );
    if (matchingChunk?.web?.uri) {
      finalUrl = matchingChunk.web.uri;
    }
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="rounded-sm border-b border-dashed border-brand-magenta/40 font-bold text-brand-magenta transition-colors hover:bg-brand-magenta/8 hover:text-brand-magenta-dark"
      >
        {children}
      </button>
      {isExpanded && (
        <span className="absolute bottom-full left-1/2 z-50 mb-3 block w-72 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-4 text-left shadow-2xl">
          <span className="mb-2 flex items-center gap-2 text-brand-magenta">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em]">Strategic Insight</span>
          </span>
          <span className="block text-xs leading-relaxed text-neutral-600">{insight.summary}</span>
          <span className="mt-4 flex items-center gap-2">
            <a
              href={finalUrl && finalUrl.startsWith('http') ? finalUrl : `https://www.google.com/search?q=${encodeURIComponent(insight.term)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-brand-navy px-3 py-2 text-[10px] font-bold text-white transition-colors hover:bg-brand-navy/90"
            >
              <ExternalLink className="h-3 w-3" />
              {finalUrl && finalUrl.startsWith('http') ? 'View Source' : 'Search Info'}
            </a>
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-md px-3 py-2 text-[10px] font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              Close
            </button>
          </span>
        </span>
      )}
    </span>
  );
}

function WorkspaceHero({
  activeCompanyName,
  selectedCompanyId,
  customQuestions,
  setCurrentInput,
  handleRemoveQuestion,
  isAddingQuestion,
  newQuestion,
  setNewQuestion,
  handleAddQuestion,
  setIsAddingQuestion,
  handleSend
}: {
  activeCompanyName?: string;
  selectedCompanyId: string | null;
  customQuestions: string[];
  setCurrentInput: (value: string) => void;
  handleRemoveQuestion: (index: number) => void;
  isAddingQuestion: boolean;
  newQuestion: string;
  setNewQuestion: (value: string) => void;
  handleAddQuestion: (event: React.FormEvent) => void;
  setIsAddingQuestion: (value: boolean) => void;
  handleSend: (event?: React.FormEvent, queryOverride?: string) => Promise<void>;
}) {
  const compactPrompts = selectedCompanyId
    ? [
        `Highlight the most discussed topics and news for ${activeCompanyName}.`,
        `What are the top pain points for ${activeCompanyName} right now?`,
        `Provide account manager specific takeaways and pitches for ${activeCompanyName}.`,
        `Outline a core timeline of major strategic milestones for ${activeCompanyName}.`
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-2 max-w-6xl space-y-4">
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_18px_48px_rgba(11,0,78,0.05)]">
        <div className="hero-grid relative px-5 py-4 md:px-6">
          <div className="pointer-events-none absolute -right-12 top-0 h-52 w-52 rounded-full bg-brand-magenta/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-48 rounded-full bg-brand-navy/7 blur-3xl" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-magenta/15 bg-brand-magenta/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-brand-magenta">
              <WandSparkles className="h-3.5 w-3.5" />
              Account Development Copilot
            </div>
            <h2 className="max-w-4xl text-[1.85rem] font-semibold leading-[1.08] tracking-tight text-brand-navy md:text-[2.2rem]">
              Turn raw market intel into a sharper pursuit strategy.
            </h2>
            <p className="max-w-5xl text-sm leading-6 text-neutral-600">
              Use the chat like a deal room: ask for buying signals, stakeholder angles, timing windows, pitch refinement, and next-best actions. The workspace is tuned for account development rather than generic research.
              {selectedCompanyId
                ? ` Start with ${activeCompanyName} by asking for top news tied to buying intent, pain points, likely champions, budget signals, or the best pitch angle.`
                : ' Select a target company to unlock account-specific prompts and a tighter commercial view.'}
            </p>
            {selectedCompanyId && (
              <div className="flex flex-wrap gap-2 pt-1">
                {compactPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentInput(prompt)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-700 transition-all hover:border-brand-magenta/35 hover:text-brand-navy"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Suggested Plays</p>
              <h3 className="mt-1 text-lg font-semibold text-brand-navy">Start from intent, not from a blank box</h3>
            </div>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {(selectedCompanyId
              ? [
                  `What are the top pain points for ${activeCompanyName} right now?`,
                  `What are the core industrial events and trade shows that ${activeCompanyName} typically attends?`,
                  `What are the clearest budget, compliance, or modernization triggers at ${activeCompanyName}?`,
                  `How should I sequence outreach across executives, operations leaders, and technical stakeholders at ${activeCompanyName}?`,
                  ...customQuestions
                ]
              : [
                  'What are the top pain points for the selected account right now?',
                  'How should I sequence outreach across executives, operations leaders, and technical stakeholders?',
                  'What are the clearest budget or modernization triggers?',
                  'What timing windows matter most for this account?',
                  ...customQuestions
                ]
            ).map((suggestion, index) => {
              const isCustom = selectedCompanyId && index >= 4;
              return (
                <div key={index} className="group relative">
                  <button
                    onClick={() => selectedCompanyId && setCurrentInput(suggestion)}
                    disabled={!selectedCompanyId}
                    className={`w-full rounded-lg border p-3.5 text-left transition-all ${selectedCompanyId ? 'border-neutral-200 bg-neutral-50/70 hover:border-brand-magenta/40 hover:bg-white hover:shadow-sm' : 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-50'}`}
                  >
                    <p className="text-sm font-medium leading-5.5 text-neutral-700">{suggestion}</p>
                  </button>
                  {isCustom && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveQuestion(index - 4);
                      }}
                      className="absolute right-3 top-3 rounded-full p-1 text-neutral-300 opacity-0 transition-opacity hover:bg-white hover:text-red-500 group-hover:opacity-100"
                      title="Remove custom question"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-[linear-gradient(180deg,#0B004E_0%,#1a0b63_100%)] p-4.5 text-white shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-magenta/80">Custom Motion</p>
          <h3 className="mt-1 text-lg font-semibold">Build your own reusable prompts</h3>
          <p className="mt-2 text-sm leading-5.5 text-white/70">
            Save your best pursuit questions here so they stay available every time you log in.
          </p>
          <div className="mt-5">
            {isAddingQuestion ? (
              <form onSubmit={handleAddQuestion} className="space-y-3">
                <textarea
                  autoFocus
                  value={newQuestion}
                  onChange={(event) => setNewQuestion(event.target.value)}
                  placeholder="Example: Which active capital programs make this the right time to push grid modernization services?"
                  className="h-28 w-full resize-none rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-brand-magenta focus:outline-none"
                />
                <div className="flex gap-2">
                  <button type="submit" className="rounded-md bg-brand-magenta px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-magenta-dark">
                    Save Prompt
                  </button>
                  <button type="button" onClick={() => setIsAddingQuestion(false)} className="rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-white/75 transition-colors hover:bg-white/8">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingQuestion(true)}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-brand-navy transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4 text-brand-magenta" />
                Add Custom Prompt
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function buildLocalFocusSummary(input: {
  companyName?: string;
  opcos: string[];
  functions: string[];
  selectedYear: number | null;
  userProfile: string;
  lastUserPrompt?: string;
}) {
  if (!input.companyName) {
    return 'Select a company and start a prompt to generate a concise focus summary for this workspace.';
  }

  const opcoText = input.opcos.length > 0 ? input.opcos.join(', ') : 'the broader account';
  const functionText = input.functions.length > 0 ? input.functions.join(', ') : 'a general commercial lens';
  const timelineText = input.selectedYear ? `the ${input.selectedYear} planning window` : 'the next five years';
  const personaText = input.userProfile || 'general account development';
  const promptText = input.lastUserPrompt ? ` The latest prompt is centered on ${input.lastUserPrompt.toLowerCase()}.` : '';

  return `Focus is on ${input.companyName}, specifically ${opcoText}, using ${functionText} and ${timelineText} through a ${personaText} lens.${promptText}`;
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedOpCos, setSelectedOpCos] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [printData, setPrintData] = useState<{ data: any; functionNames: string[]; selectedYear: number | null } | null>(null);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [isConversationCollapsed, setIsConversationCollapsed] = useState(false);
  const [isFocusCollapsed, setIsFocusCollapsed] = useState(false);
  const [focusSummary, setFocusSummary] = useState('Select a company and start a prompt to generate a concise AI focus summary for this workspace.');
  const [focusLoading, setFocusLoading] = useState(false);
  const [composerHeight, setComposerHeight] = useState(104);
  const [isResizingComposer, setIsResizingComposer] = useState(false);
  const [isComposerCollapsed, setIsComposerCollapsed] = useState(false);
  const [docketSubscription, setDocketSubscription] = useState<DocketWatchSubscription | null>(null);
  const [docketTargets, setDocketTargets] = useState<DocketWatchTarget[]>([]);
  const [docketEvents, setDocketEvents] = useState<DocketWatchEvent[]>([]);
  const [docketLoading, setDocketLoading] = useState(false);
  const [docketSyncing, setDocketSyncing] = useState(false);
  const [docketError, setDocketError] = useState<string | null>(null);
  const [docketStatus, setDocketStatus] = useState('Sign in to load your docket watch.');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const lastGoodFocusSummaryRef = useRef<string>('');

  useEffect(() => {
    void initializeSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!user || !stateHydrated) {
      setDocketSubscription(null);
      setDocketTargets([]);
      setDocketEvents([]);
      setDocketError(null);
      setDocketStatus('Sign in to load your docket watch.');
      return;
    }

    void refreshDocketWatch();
  }, [user, stateHydrated]);

  useEffect(() => {
    if (!user || !stateHydrated) {
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void saveUserState({
        selectedCompanyId,
        selectedOpCos,
        selectedFunctions,
        selectedYear,
        userProfile,
        customQuestions,
        messages: messages.map((message) => ({
          ...message,
          timestamp: message.timestamp.toISOString()
        }))
      }).catch((saveError: any) => {
        console.error('Failed to save user state', saveError);
      });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, stateHydrated, selectedCompanyId, selectedOpCos, selectedFunctions, selectedYear, userProfile, customQuestions, messages]);

  useEffect(() => {
    if (!user || !stateHydrated) {
      return;
    }

    const activeCompany = COMPANIES.find((company) => company.id === selectedCompanyId);
    if (!activeCompany) {
      setFocusSummary('Select a company and start a prompt to generate a concise AI focus summary for this workspace.');
      setFocusLoading(false);
      return;
    }

    const activeOpCos = activeCompany.opcos.filter((opco) => selectedOpCos.includes(opco.id)).map((opco) => opco.name);
    const functionNames = FUNCTIONS.filter((func) => selectedFunctions.includes(func.id)).map((func) => func.name);
    const lastUserPrompt = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const lastAssistantSummary = [...messages].reverse().find((message) => message.role === 'assistant')?.content.slice(0, 600) || '';
    const localFallback = buildLocalFocusSummary({
      companyName: activeCompany.name,
      opcos: activeOpCos,
      functions: functionNames,
      selectedYear,
      userProfile,
      lastUserPrompt
    });

    if (focusTimeoutRef.current) {
      window.clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = window.setTimeout(() => {
      setFocusLoading(true);
      void fetchFocusSummary({
        companyName: activeCompany.name,
        opcos: activeOpCos,
        functions: functionNames,
        selectedYear,
        userProfile,
        lastUserPrompt,
        lastAssistantSummary
      })
        .then((summary) => {
          const cleaned = summary.trim() || localFallback;
          lastGoodFocusSummaryRef.current = cleaned;
          setFocusSummary(cleaned);
        })
        .catch((summaryError: any) => {
          console.error('Failed to load focus summary', summaryError);
          setFocusSummary(lastGoodFocusSummaryRef.current || localFallback);
        })
        .finally(() => setFocusLoading(false));
    }, 700);

    return () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [user, stateHydrated, selectedCompanyId, selectedOpCos, selectedFunctions, selectedYear, userProfile, messages]);

  useEffect(() => {
    if (!isResizingComposer) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const nextHeight = window.innerHeight - event.clientY - 12;
      setComposerHeight(Math.min(220, Math.max(84, nextHeight)));
    };

    const handleUp = () => {
      setIsResizingComposer(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingComposer]);

  const initializeSession = async () => {
    setAuthLoading(true);
    setAuthInitError(null);

    try {
      const session = await restoreSession();
      if (session) {
        setUser(session.user);
        hydrateFromState(session.state);
      } else {
        hydrateFromState(defaultAppState());
      }
    } catch (sessionError: any) {
      console.error('Failed to initialize session', sessionError);
      setAuthInitError(sessionError?.message || 'Failed to load application configuration.');
      hydrateFromState(defaultAppState());
      setUser(null);
    }

    setAuthLoading(false);
  };

  const hydrateFromState = (state: PersistedState) => {
    setSelectedCompanyId(state.selectedCompanyId);
    setSelectedOpCos(state.selectedOpCos || []);
    setSelectedFunctions(state.selectedFunctions || []);
    setSelectedYear(state.selectedYear);
    setUserProfile(state.userProfile || '');
    setCustomQuestions(state.customQuestions || []);
    setMessages((state.messages || []).map((message) => ({ ...message, timestamp: new Date(message.timestamp) })));
    setStateHydrated(true);
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    setAuthSubmitting(true);
    try {
      const session = await register(name, email, password);
      setUser(session.user);
      hydrateFromState(session.state);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthSubmitting(true);
    try {
      const session = await login(email, password);
      setUser(session.user);
      hydrateFromState(session.state);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setStateHydrated(false);
    hydrateFromState(defaultAppState());
  };

  const handleAddQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newQuestion.trim()) {
      return;
    }
    setCustomQuestions((previous) => [...previous, newQuestion.trim()]);
    setNewQuestion('');
    setIsAddingQuestion(false);
  };

  const handleRemoveQuestion = (index: number) => {
    setCustomQuestions((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSelectCompany = (id: string | null) => {
    setSelectedCompanyId(id);
    setSelectedOpCos([]);
  };

  const handleToggleOpCo = (id: string) => {
    setSelectedOpCos((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));
  };

  const handleToggleFunction = (id: string) => {
    setSelectedFunctions((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result as string;
      setUploadedFile({ name: file.name, content });
    };
    reader.readAsText(file);
  };

  const handleSend = async (event?: React.FormEvent, queryOverride?: string) => {
    event?.preventDefault();
    const query = queryOverride || currentInput.trim() || 'Generate a comprehensive strategic intelligence report based on the selected OpCos and analysis lens.';

    if (!queryOverride && !currentInput.trim() && !uploadedFile && event) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: queryOverride || (currentInput.trim() ? currentInput : uploadedFile ? `Analyzed file: ${uploadedFile.name}` : 'Generate Strategic Report'),
      timestamp: new Date()
    };

    setMessages((previous) => [...previous, userMessage]);
    setCurrentInput('');
    setLoading(true);
    setError(null);

    try {
      const selectedCompany = COMPANIES.find((company) => company.id === selectedCompanyId);
      const companyName = selectedCompany?.name;
      const opcoNames = selectedCompany?.opcos.filter((opco) => selectedOpCos.includes(opco.id)).map((opco) => opco.name) || [];
      const targetOpCos = opcoNames.length > 0 ? opcoNames : companyName ? [companyName] : [];
      const functionNames = FUNCTIONS.filter((func) => selectedFunctions.includes(func.id)).map((func) => func.name);
      const data = await fetchNews(targetOpCos, functionNames, query, uploadedFile?.content, userProfile);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.text,
        type: 'report',
        data,
        timestamp: new Date(),
        contacts: data.contacts,
        keywords: data.keywords
      };

      setMessages((previous) => [...previous, assistantMessage]);
      setUploadedFile(null);
    } catch (requestError: any) {
      console.error('Error fetching news:', requestError);
      setError(requestError.message || 'Failed to fetch news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlanOfAttack = async (reportText: string) => {
    setLoading(true);
    setError(null);
    try {
      const plan = await fetchPlanOfAttack(reportText, userProfile);
      setMessages((previous) => [...previous, { role: 'assistant', content: plan, type: 'text', timestamp: new Date() }]);
    } catch (requestError: any) {
      console.error('Error generating plan of attack:', requestError);
      setError(requestError.message || 'Failed to generate plan of attack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTxt = (data: any) => {
    if (!data) {
      return;
    }
    const file = new Blob([data.text], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `Wintel_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportPdf = async (data: any) => {
    try {
      setIsExporting(true);
      setPrintData({
        data,
        functionNames: FUNCTIONS.filter((func) => selectedFunctions.includes(func.id)).map((func) => func.name),
        selectedYear
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      window.print();
      setPrintData(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = (id: string) => {
    const element = document.getElementById(`report-${id}`);
    if (!element) {
      return;
    }

    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, svg, .print\\:hidden').forEach((entry) => entry.remove());

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Wintel Report</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #000; }
          h1 { color: #0B004E; font-size: 24pt; margin-bottom: 12pt; }
          h2 { color: #0B004E; font-size: 18pt; margin-top: 24pt; margin-bottom: 10pt; }
          h3 { color: #0B004E; font-size: 14pt; margin-top: 18pt; margin-bottom: 8pt; }
          p { font-size: 11pt; line-height: 1.5; margin-bottom: 10pt; }
          li { font-size: 11pt; line-height: 1.5; margin-bottom: 6pt; }
          a { color: #FF00CC; text-decoration: underline; }
        </style>
      </head>
      <body>${clone.innerHTML}</body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Wintel_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAskAboutContact = (contact: Contact) => {
    const query = `Tell me more about ${contact.name}, ${contact.title}. Why are they a key stakeholder for the opportunities identified? How should I approach them?`;
    void handleSend(undefined, query);
  };

  const refreshDocketWatch = async () => {
    if (!user) {
      return;
    }

    setDocketLoading(true);
    setDocketError(null);

    try {
      const result = await fetchDocketWatchEvents();
      setDocketSubscription(result.subscription);
      setDocketTargets(result.targets);
      setDocketEvents(result.events);

      if (!result.subscription) {
        setDocketStatus('Docket watch has not been initialized for this user yet.');
      } else if (result.targets.length === 0) {
        setDocketStatus(`Watching weekly for ${result.subscription.recipient_email}. No active docket targets are available yet.`);
      } else if (result.events.length === 0) {
        setDocketStatus(`Watching weekly for ${result.subscription.recipient_email}. Latest docket summaries are loaded; no change events recorded yet.`);
      } else {
        setDocketStatus(`Watching weekly for ${result.subscription.recipient_email}. ${result.events.length} recent docket event${result.events.length === 1 ? '' : 's'} loaded.`);
      }
    } catch (loadError: any) {
      setDocketError(loadError?.message || 'Failed to load docket watch.');
      setDocketStatus('Docket watch could not be loaded.');
    } finally {
      setDocketLoading(false);
    }
  };

  const handleRunDocketSync = async () => {
    setDocketSyncing(true);
    setDocketError(null);

    try {
      const result = await runDocketWatchSync();
      const warningText = result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(' | ')}` : '';
      setDocketStatus(`Checked ${result.scannedTargets} active docket target${result.scannedTargets === 1 ? '' : 's'}. Created ${result.createdEvents} new event${result.createdEvents === 1 ? '' : 's'}.${warningText}`);
      await refreshDocketWatch();
    } catch (syncError: any) {
      setDocketError(syncError?.message || 'Failed to run docket sync.');
      setDocketStatus('Docket sync failed.');
    } finally {
      setDocketSyncing(false);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
    setCurrentInput('');
    setUploadedFile(null);
    setError(null);
    setIsConversationCollapsed(false);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-navy text-white">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-6 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-brand-magenta" />
          <span className="text-sm font-medium">Loading secure workspace...</span>
        </div>
      </div>
    );
  }

  if (authInitError) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,0,204,0.18),_transparent_35%),linear-gradient(135deg,_#07011f_0%,_#0B004E_52%,_#1d0b59_100%)] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-magenta">Configuration Required</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">App configuration is incomplete.</h1>
            <p className="mt-4 text-sm leading-7 text-white/75">{authInitError}</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
              <p>Add these in Vercel, then redeploy:</p>
              <p className="mt-3 font-mono text-xs leading-6">VITE_SUPABASE_URL</p>
              <p className="font-mono text-xs leading-6">VITE_SUPABASE_ANON_KEY</p>
              <p className="font-mono text-xs leading-6">NEXT_PUBLIC_SUPABASE_URL</p>
              <p className="font-mono text-xs leading-6">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
              <p className="font-mono text-xs leading-6">SUPABASE_URL</p>
              <p className="font-mono text-xs leading-6">SUPABASE_ANON_KEY</p>
              <p className="font-mono text-xs leading-6">OPENAI_API_KEY</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage loading={authSubmitting} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const currentFunctionNames = FUNCTIONS.filter((func) => selectedFunctions.includes(func.id)).map((func) => func.name);
  const activeCompany = COMPANIES.find((company) => company.id === selectedCompanyId);
  const activeCompanyName = activeCompany?.name;
  const activeOpCos = activeCompany?.opcos.filter((opco) => selectedOpCos.includes(opco.id)).map((opco) => opco.name) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 font-sans text-neutral-900 print:h-auto print:overflow-visible print:bg-white">
      <motion.div
        initial={false}
        animate={{ width: isSidebarOpen ? 272 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full overflow-hidden border-r border-brand-navy bg-brand-navy print:hidden"
      >
        <div className="h-full w-[272px]">
          <Sidebar
            companyGroups={COMPANIES}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={handleSelectCompany}
            selectedOpCos={selectedOpCos}
            onToggleOpCo={handleToggleOpCo}
            functions={FUNCTIONS}
            selectedFunctions={selectedFunctions}
            onToggleFunction={handleToggleFunction}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            userProfile={userProfile}
            onChangeUserProfile={setUserProfile}
            onGenerate={() => void handleSend()}
            loading={loading}
            userName={user.name}
            userEmail={user.email}
            onLogout={() => void handleLogout()}
          />
        </div>
      </motion.div>

      <main className="relative flex h-full flex-1 flex-col overflow-hidden print:overflow-visible">
        <div className="flex-1 overflow-y-auto px-4 py-3 print:overflow-visible print:p-0 md:px-5">
          <div className="mx-auto max-w-7xl space-y-4">
            <div className="sticky top-0 z-20 pt-1">
              <div className="rounded-xl border border-neutral-200 bg-white/92 shadow-sm backdrop-blur">
                <button
                  onClick={() => setIsFocusCollapsed((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Focus Summary</p>
                    <h3 className="mt-1 text-base font-semibold text-brand-navy">
                      {activeCompanyName ? `${activeCompanyName} account angle` : 'Workspace focus'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsSidebarOpen((current) => !current);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100"
                      title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                    >
                      {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                    {isFocusCollapsed ? <ChevronDown className="h-4 w-4 text-neutral-500" /> : <ChevronUp className="h-4 w-4 text-neutral-500" />}
                  </div>
                </button>

                {!isFocusCollapsed && (
                  <div className="border-t border-neutral-200 px-4 py-3">
                    <p className="text-sm leading-6 text-neutral-700">
                      {focusLoading ? 'Refreshing AI summary...' : focusSummary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
                      <span><strong className="font-semibold text-brand-navy">OpCos:</strong> {activeOpCos.length > 0 ? activeOpCos.join(', ') : 'All relevant entities'}</span>
                      <span><strong className="font-semibold text-brand-navy">Functions:</strong> {currentFunctionNames.length > 0 ? currentFunctionNames.join(', ') : 'General lens'}</span>
                      <span><strong className="font-semibold text-brand-navy">Timeline:</strong> {selectedYear || 'Next 5 years'}</span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-brand-magenta/12 bg-[linear-gradient(180deg,rgba(248,244,255,0.95),rgba(255,255,255,0.96))] p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-brand-magenta">
                            <BellRing className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Docket Watch</span>
                          </div>
                          <h3 className="mt-2 text-base font-semibold text-brand-navy">Monitor official filing changes without leaving the workspace</h3>
                          <p className="mt-1 text-sm leading-6 text-neutral-600">
                            {docketLoading ? 'Loading watch status...' : docketStatus}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRunDocketSync()}
                          disabled={!user || docketLoading || docketSyncing}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white shadow-lg shadow-brand-navy/15 transition-colors hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {docketSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Check Docket Changes
                        </button>
                      </div>

                      {docketSubscription && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-neutral-600">
                            Weekly email to {docketSubscription.recipient_email}
                          </span>
                          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-neutral-600">
                            Cadence: {docketSubscription.frequency}
                          </span>
                        </div>
                      )}

                      {docketError && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {docketError}
                        </div>
                      )}

                      {!docketLoading && docketEvents.length === 0 && !docketError && (
                        <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-4 py-4 text-sm leading-6 text-neutral-500">
                          No docket changes have been captured yet. Use <span className="font-semibold text-brand-navy">Check Docket Changes</span> to poll the active watches and populate this feed when official filings move.
                        </div>
                      )}

                      {docketTargets.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-3 flex items-center gap-2 text-brand-magenta">
                            <RadioTower className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Latest Docket Summaries</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {docketTargets.map((target) => (
                              <a
                                key={target.id}
                                href={target.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-brand-magenta/35 hover:shadow-md"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-magenta">
                                    {target.state} {target.utility_type}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-brand-magenta" />
                                </div>
                                <h4 className="mt-2 text-sm font-semibold leading-6 text-brand-navy">{target.display_name}</h4>
                                <p className="mt-2 text-sm leading-6 text-neutral-600">
                                  {target.summary_text || 'No snapshot has been stored yet. Run a docket check to fetch the latest official summary.'}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {target.docket_numbers.map((docketNumber) => (
                                    <span
                                      key={`${target.id}-${docketNumber}`}
                                      className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold text-neutral-600"
                                    >
                                      {docketNumber}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-3 text-xs text-neutral-400">
                                  {target.last_checked_at ? `Last checked ${format(new Date(target.last_checked_at), 'MMM d, yyyy h:mm a')}` : 'Not checked yet'}
                                </p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {docketEvents.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-3 flex items-center gap-2 text-brand-magenta">
                            <BellRing className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Recent Change Events</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                          {docketEvents.slice(0, 4).map((event) => (
                            <a
                              key={event.id}
                              href={event.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-brand-magenta/35 hover:shadow-md"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-magenta">
                                  {event.event_type.replace(/_/g, ' ')}
                                </span>
                                <ExternalLink className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-brand-magenta" />
                              </div>
                              <h4 className="mt-2 text-sm font-semibold leading-6 text-brand-navy">{event.title}</h4>
                              <p className="mt-2 text-sm leading-6 text-neutral-600">{event.summary}</p>
                              <p className="mt-3 text-xs text-neutral-400">{format(new Date(event.event_date), 'MMM d, yyyy h:mm a')}</p>
                            </a>
                          ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <WorkspaceHero
                  activeCompanyName={activeCompanyName}
                  selectedCompanyId={selectedCompanyId}
                  customQuestions={customQuestions}
                  setCurrentInput={setCurrentInput}
                  handleRemoveQuestion={handleRemoveQuestion}
                  isAddingQuestion={isAddingQuestion}
                  newQuestion={newQuestion}
                  setNewQuestion={setNewQuestion}
                  handleAddQuestion={handleAddQuestion}
                  setIsAddingQuestion={setIsAddingQuestion}
                  handleSend={handleSend}
                />
              ) : (
                <div className="space-y-5 pb-28">
                  <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <button
                      onClick={() => setIsConversationCollapsed((current) => !current)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Conversation</p>
                        <h3 className="mt-1 text-base font-semibold text-brand-navy">
                          {isConversationCollapsed ? 'Expand transcript' : 'Chat transcript and outputs'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConversationCollapsed ? <ChevronDown className="h-4 w-4 text-neutral-500" /> : <ChevronUp className="h-4 w-4 text-neutral-500" />}
                      </div>
                    </button>
                    {isConversationCollapsed && (
                      <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-600">
                        {messages.length} messages are hidden. Expand this panel to review the full conversation and reports.
                      </div>
                    )}
                  </div>

                  {!isConversationCollapsed && messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                      >
                        {message.role === 'user' ? (
                          <div className="max-w-2xl rounded-lg rounded-tr-sm bg-gradient-to-br from-brand-navy to-[#24106F] px-4 py-3.5 text-white shadow-xl shadow-brand-navy/15">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Your Prompt
                            </div>
                            <p className="text-sm leading-6 text-white/95">{message.content}</p>
                            <p className="mt-2 text-right text-[10px] text-white/50">{format(message.timestamp, 'h:mm a')}</p>
                          </div>
                        ) : (
                          <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_28px_90px_rgba(11,0,78,0.08)]">
                            <div className="border-b border-neutral-200 px-5 py-4 md:px-6">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="mb-2 flex items-center gap-2 text-brand-magenta">
                                    <RadioTower className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Account Planning Brief</span>
                                  </div>
                                  <h3 className="text-lg font-semibold text-brand-navy">
                                    {message.type === 'report' ? 'Recency, opportunity, stakeholder, and attack view' : 'Plan of Attack'}
                                  </h3>
                                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                                    Organized around the four account-planning lenses that matter most in live pursuit work.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 print:hidden">
                                  <button onClick={() => handleExportTxt(message.data)} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100">
                                    <Download className="h-3.5 w-3.5" />
                                    TXT
                                  </button>
                                  <button onClick={() => void handleExportPdf(message.data)} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100">
                                    <FileDown className="h-3.5 w-3.5" />
                                    PDF
                                  </button>
                                  <button onClick={() => handleExportWord(index.toString())} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100">
                                    <FileDown className="h-3.5 w-3.5" />
                                    Word
                                  </button>
                                  {message.type === 'report' && (
                                    <button
                                      onClick={() => void handleGeneratePlanOfAttack(message.data.text)}
                                      disabled={loading}
                                      className="inline-flex items-center gap-2 rounded-md bg-brand-magenta px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-magenta-dark disabled:opacity-50"
                                    >
                                      <WandSparkles className="h-3.5 w-3.5" />
                                      Generate Plan of Attack
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div id={`report-${index}`} className="space-y-5 px-5 py-5 md:px-6">
                              {message.type === 'report' ? (
                                <Dashboard data={{ ...message.data, keywords: message.keywords }} functionNames={currentFunctionNames} selectedYear={selectedYear} />
                              ) : (
                                <div className="prose prose-sm max-w-none prose-neutral prose-a:text-brand-magenta prose-a:no-underline prose-headings:font-semibold prose-headings:text-brand-navy hover:prose-a:underline">
                                  <Markdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      strong: ({ children }) => (
                                        <KeywordTooltip term={String(children)} keywords={message.keywords} groundingChunks={message.data?.groundingChunks}>
                                          {children}
                                        </KeywordTooltip>
                                      )
                                    }}
                                  >
                                    {message.content}
                                  </Markdown>
                                </div>
                              )}

                              {message.contacts && message.contacts.length > 0 && (
                                <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
                                  <div className="mb-4 flex items-center gap-2">
                                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                                    <h3 className="text-base font-bold text-brand-navy">Key Strategic Contacts</h3>
                                  </div>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    {message.contacts.map((contact, contactIndex) => (
                                      <div key={contactIndex} className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm">
                                        <div className="mb-3 flex items-start gap-3">
                                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-navy/8">
                                            <UserPlus className="h-5 w-5 text-brand-navy" />
                                          </div>
                                          <div>
                                            <h4 className="text-sm font-bold leading-tight text-brand-navy">{contact.name}</h4>
                                            <p className="text-xs font-medium text-neutral-500">{contact.title}</p>
                                          </div>
                                        </div>
                                        <p className="mb-4 flex-grow text-xs italic leading-5 text-neutral-600">"{contact.relevance}"</p>
                                        <div className="flex gap-2">
                                          <a
                                            href={contact.linkedinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#0A66C2] py-2 text-xs font-bold text-white transition-colors hover:bg-[#004182]"
                                          >
                                            <Linkedin className="h-3 w-3" />
                                            Profile
                                          </a>
                                          <button
                                            onClick={() => handleAskAboutContact(contact)}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
                                          >
                                            <MessageSquare className="h-3 w-3" />
                                            Ask AI
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                  ))}

                    {isExporting && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-4 text-neutral-500 shadow-sm">
                          <Loader2 className="h-5 w-5 animate-spin text-brand-magenta" />
                          <span className="text-sm font-medium italic">Preparing export...</span>
                        </div>
                      </motion.div>
                    )}

                    {loading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-4 text-neutral-500 shadow-sm">
                          <Loader2 className="h-5 w-5 animate-spin text-brand-magenta" />
                          <span className="text-sm font-medium italic">Generating commercial angles, stakeholder ideas, and next steps...</span>
                        </div>
                      </motion.div>
                    )}

                    {error && (
                      <div className="flex items-start rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        <AlertCircle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium">Error generating insights</h3>
                          <p className="mt-1 text-sm text-red-600">{error}</p>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="border-t border-neutral-200 bg-white/88 px-4 py-0 backdrop-blur-md print:hidden md:px-6">
          <div className="mx-auto max-w-7xl">
            {uploadedFile && (
              <div className="mb-2 mt-2 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 shadow-sm">
                <FileText className="h-4 w-4 text-brand-magenta" />
                <span className="max-w-[220px] truncate text-xs font-medium text-neutral-600">{uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)} className="rounded-full p-0.5 transition-colors hover:bg-neutral-100">
                  <X className="h-3 w-3 text-neutral-400" />
                </button>
              </div>
            )}

            <div className="overflow-hidden rounded-[1.6rem] border border-neutral-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,255,0.96))] shadow-[0_24px_70px_rgba(11,0,78,0.08)]">
              <button
                type="button"
                onClick={() => setIsComposerCollapsed((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Prompt</p>
                  <p className="mt-0.5 text-base font-semibold text-brand-navy">
                    {isComposerCollapsed ? 'Expand account planning workspace' : 'Shape the next account planning brief'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {!isComposerCollapsed && <span className="text-[10px] text-neutral-500">{currentInput.trim().length} chars</span>}
                  {isComposerCollapsed ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {!isComposerCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                  <div className="border-t border-neutral-200/80 bg-[linear-gradient(135deg,rgba(11,0,78,0.02),rgba(255,0,204,0.04))] px-5 py-4">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {PRIORITY_TILES.map((tile) => {
                        const Icon = tile.icon;
                        return (
                          <div key={tile.title} className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm">
                            <div className="flex items-center gap-2 text-brand-magenta">
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{tile.title}</span>
                            </div>
                            <p className="mt-2 text-xs leading-5 text-neutral-600">{tile.subtitle}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseDown={() => setIsResizingComposer(true)}
                    className={`flex h-3 w-full cursor-row-resize items-center justify-center border-y border-neutral-200 text-neutral-300 transition-colors hover:text-neutral-500 ${isResizingComposer ? 'bg-neutral-50' : 'bg-white'}`}
                    title="Drag to resize prompt area"
                  >
                    <span className="h-1 w-8 rounded-full bg-current/60" />
                  </button>
                  <div className="grid gap-2 border-b border-neutral-100 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
                    {QUICK_CHAT_TEMPLATES.map((template) => {
                      const Icon = template.icon;
                      return (
                        <button
                          key={template.label}
                          onClick={() => activeCompanyName && setCurrentInput(template.build(activeCompanyName))}
                          disabled={!activeCompanyName}
                          className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-magenta/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2 text-brand-magenta">
                            <Icon className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">{template.label}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-brand-navy">{template.detail}</p>
                        </button>
                      );
                    })}
                  </div>

                  <form onSubmit={(event) => void handleSend(event)} className="px-5 py-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Ask Wintel</p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Frame the brief around fresh developments, opportunity creation, stakeholder movement, and attack strategy.
                        </p>
                      </div>
                      <div className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[10px] font-semibold text-neutral-500">
                        {currentInput.trim().length} chars
                      </div>
                    </div>
                    <textarea
                      value={currentInput}
                      onChange={(event) => setCurrentInput(event.target.value)}
                      placeholder={selectedCompanyId ? 'Example: What is the freshest news, who inside the client is implicated, what opportunity does it create, and what should I say in my first outreach?' : 'Select a company in the sidebar to start the pursuit workspace...'}
                      disabled={!selectedCompanyId}
                      style={{ height: composerHeight }}
                      className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm leading-6 text-neutral-800 shadow-inner transition-all placeholder:text-neutral-400 focus:border-brand-magenta/35 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-400"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                        <span>Drag to resize</span>
                        <span>Best results come from account-planning questions tied to a recent trigger</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {messages.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearConversation}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
                            title="Clear conversation"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Clear
                          </button>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.json" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-navy"
                          title="Attach context file"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="submit"
                          disabled={loading || !selectedCompanyId || (!currentInput.trim() && !uploadedFile)}
                          className="inline-flex h-8 items-center gap-2 rounded-md bg-brand-navy px-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-navy/15 transition-colors hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send
                        </button>
                      </div>
                    </div>
                  </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div id="print-root" className="hidden">
          {printData && (
            <div className="p-8">
              <div className="mb-12 flex items-end justify-between border-b-4 border-brand-navy pb-6">
                <div>
                  <h1 className="m-0 text-4xl font-bold text-brand-navy">Strategic Intelligence Report</h1>
                  <p className="mt-2 text-lg text-neutral-500">Powered by Wintel AI Assistant</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold uppercase tracking-widest text-brand-navy">Confidential</p>
                  <p className="mt-1 text-sm text-neutral-400">{format(new Date(), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-brand-navy">Report Context</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold uppercase text-neutral-400">Account Persona</p>
                    <p className="mt-1 text-sm text-neutral-700">{userProfile || 'General Enterprise Sales'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-neutral-400">Functional Focus</p>
                    <p className="mt-1 text-sm text-neutral-700">{printData.functionNames.join(', ') || 'General Industry'}</p>
                  </div>
                </div>
              </div>

              <Dashboard data={printData.data} functionNames={printData.functionNames} selectedYear={printData.selectedYear} />

              <div className="mt-20 border-t border-neutral-100 pt-8 text-center">
                <p className="text-xs italic text-neutral-400">
                  This report was generated using real-time market signals and regulatory data. For internal use only.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
