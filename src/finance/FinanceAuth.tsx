import React, { createContext, useContext, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { get, getToken, onAuthChange, post, setToken } from './api';
import { Btn, ErrorBox, Field, Input, Loading, useAction } from './ui';
import { useDmc } from '../context/DmcContext';

export interface FinanceUser { id: string; loginId: string; name: string; department: string; isManager: boolean; permissions: string[] }

const Ctx = createContext<{ user: FinanceUser; can: (p: string) => boolean; signOut: () => void } | null>(null);
export const useFinanceUser = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFinanceUser outside FinanceAuthGate');
  return c;
};

/**
 * The finance module talks to the server, which enforces permissions, so it needs
 * a real sign-in (the rest of the prototype only picks a department locally).
 */
export const FinanceAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentEmployee } = useDmc();
  const [user, setUser] = useState<FinanceUser | null>(null);
  const [checking, setChecking] = useState(!!getToken());
  const [loginId, setLoginId] = useState(currentEmployee?.loginId ?? '');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAction();

  const loadMe = () => {
    if (!getToken()) { setUser(null); setChecking(false); return; }
    setChecking(true);
    get<FinanceUser>('/me').then(setUser).catch(() => setUser(null)).finally(() => setChecking(false));
  };
  useEffect(() => { loadMe(); return onAuthChange(loadMe); }, []);

  if (checking) return <Loading />;
  if (!user) {
    return (
      <div className="max-w-sm mx-auto mt-10 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-700" />
          <h2 className="text-sm font-bold text-slate-900">Sign in to Tour Financials</h2>
        </div>
        <p className="text-xs text-slate-500">Financial records are stored on the server and access depends on your department. Use your ERP login ID.</p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const r = await post<{ token: string }>('/auth/login', { loginId: loginId.trim(), password });
              setPassword('');
              setToken(r.token);
            });
          }}
        >
          <Field label="Login ID"><Input autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} required /></Field>
          <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <ErrorBox error={error} />
          <Btn variant="primary" type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Btn>
        </form>
      </div>
    );
  }
  const can = (p: string) => user.permissions.includes(p);
  return <Ctx.Provider value={{ user, can, signOut: () => setToken(null) }}>{children}</Ctx.Provider>;
};
