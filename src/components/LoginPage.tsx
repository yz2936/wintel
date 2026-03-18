import { useMemo, useState } from 'react';
import { Loader2, LockKeyhole, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,0,204,0.18),_transparent_35%),linear-gradient(135deg,_#07011f_0%,_#0B004E_52%,_#1d0b59_100%)] text-white px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:flex-row flex-col">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white/80">
            <Sparkles className="h-4 w-4 text-brand-magenta" />
            Wintel Secure Workspace
          </div>
          <div className="space-y-5">
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight">
              Private deal intelligence, now behind a real login.
            </h1>
            <p className="max-w-xl text-base leading-7 text-white/70">
              Sign in to restore your saved account selections, persona, custom prompts, and previous reports from the local SQLite database.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-magenta">Persistent</p>
              <p className="mt-3 text-sm text-white/75">User data survives refreshes and app restarts.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-magenta">Local DB</p>
              <p className="mt-3 text-sm text-white/75">Accounts and saved state are stored in `data/wintel.db`.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-magenta">Server-Side Key</p>
              <p className="mt-3 text-sm text-white/75">The OpenAI key stays on the backend instead of the browser.</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 flex rounded-2xl bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-white text-brand-navy' : 'text-white/70'}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${mode === 'register' ? 'bg-white text-brand-navy' : 'text-white/70'}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-magenta"
                    placeholder="Taylor Morgan"
                    required
                  />
                </label>
              )}

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-magenta"
                  placeholder="you@company.com"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-magenta"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-magenta px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-magenta-dark disabled:opacity-60"
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
