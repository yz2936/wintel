import { useMemo, useState } from 'react';
import { Loader2, LockKeyhole, Shield, Database, Server } from 'lucide-react';

interface LoginPageProps {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}

export function LoginPage({ loading, onLogin, onRegister }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const actionLabel = useMemo(() => (mode === 'login' ? 'Log In' : 'Create Account'), [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(name, email, password);
      }
    } catch (submitError: any) {
      setError(submitError.message || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_rgba(255,0,204,0.14),_transparent_40%),radial-gradient(ellipse_at_bottom_right,_rgba(11,0,78,0.3),_transparent_50%),linear-gradient(160deg,_#07011f_0%,_#0B004E_50%,_#150856_100%)] text-white px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 lg:flex-row flex-col">
        {/* Left — hero */}
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
            <Shield className="h-3.5 w-3.5 text-brand-magenta" />
            Secure Workspace
          </div>
          <div className="space-y-5">
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight lg:text-[3.2rem] lg:leading-[1.1]">
              Strategic intelligence for utility account teams.
            </h1>
            <p className="max-w-lg text-[15px] leading-7 text-white/55">
              Sign in to restore your saved account selections, persona, custom prompts, and previous reports.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Database, title: 'Persistent', desc: 'Survives refreshes and restarts.' },
              { icon: Server, title: 'Postgres-backed', desc: 'Supabase with per-user access.' },
              { icon: LockKeyhole, title: 'Server-side key', desc: 'API keys stay on the backend.' }
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/8 bg-white/[0.04] p-4">
                <item.icon className="h-4 w-4 text-brand-magenta mb-2.5" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{item.title}</p>
                <p className="mt-1.5 text-[12px] leading-5 text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
            {/* Mode toggle */}
            <div className="mb-5 flex rounded-xl bg-black/20 p-0.5">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${mode === 'login' ? 'bg-white text-brand-navy shadow-sm' : 'text-white/50 hover:text-white/70'}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${mode === 'register' ? 'bg-white text-brand-navy shadow-sm' : 'text-white/50 hover:text-white/70'}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[13px] text-white outline-none transition-all focus:border-brand-magenta/50 focus:bg-black/30 placeholder:text-white/20"
                    placeholder="Taylor Morgan"
                    required
                  />
                </label>
              )}

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[13px] text-white outline-none transition-all focus:border-brand-magenta/50 focus:bg-black/30 placeholder:text-white/20"
                  placeholder="you@company.com"
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[13px] text-white outline-none transition-all focus:border-brand-magenta/50 focus:bg-black/30 placeholder:text-white/20"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-magenta to-brand-magenta-dark px-4 py-3 text-[13px] font-bold text-white transition-all hover:shadow-lg hover:shadow-brand-magenta/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {actionLabel}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
