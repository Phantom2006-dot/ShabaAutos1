import React, { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
import { getAuthHeaders } from '../services/api';

interface ApiKeyDef {
  keyId: string;
  label: string;
  hint: string;
  envName: string;
  configured: boolean;
  stored: boolean;
  masked?: string;
}

type VaultFeedback = { kind: 'error' | 'success'; text: string } | null;

export default function ApiKeyVault({ isAdmin }: { isAdmin: boolean }) {
  const [defs, setDefs] = useState<ApiKeyDef[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<VaultFeedback>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ops/api-keys', { headers });
      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json.data)) {
        setDefs(json.data as ApiKeyDef[]);
        setDrafts({});
        return;
      }
      setFeedback({ kind: 'error', text: json?.message || 'Failed to load API keys.' });
    } catch {
      setFeedback({ kind: 'error', text: 'Failed to load API keys.' });
    } finally {
      setLoading(false);
    }
  }, [reloadKey]);

  useEffect(() => { void load(); }, [load]);

  const saveAll = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const entries = defs?.filter((d) => (drafts[d.keyId] ?? '').trim().length > 0).map((d) => ({ keyId: d.keyId, value: drafts[d.keyId].trim() }));
      if (!entries || entries.length === 0) {
        setFeedback({ kind: 'error', text: 'Enter a value for at least one API key first.' });
        return;
      }
      const headers = await getAuthHeaders();
      const res = await fetch('/api/ops/api-keys', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ keys: entries }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setFeedback({ kind: 'success', text: 'API keys saved. They are now used live by the server.' });
        setDefs(json.data as ApiKeyDef[]);
        setDrafts({});
      } else {
        setFeedback({ kind: 'error', text: json?.message || 'Failed to save API keys.' });
      }
    } catch {
      setFeedback({ kind: 'error', text: 'Failed to save API keys.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading API key vault...</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="API key vault">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-emerald-700" />
        <h3 className="font-semibold text-slate-800">API key vault</h3>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          aria-label="Reload API keys"
        >
          <RefreshCw className="h-3.5 w-3.5" />Reload
        </button>
      </div>
      <p className="mb-4 text-sm leading-6 text-slate-500">
        Store the API keys your deployment uses in production, including GROQ AI, Clerk, and Cloudinary. Saved keys are applied at runtime without redeploying — and they never appear in full after saving.
      </p>
      {feedback && (
        <div className={`mb-4 flex items-start gap-3 rounded-2xl border p-4 text-sm ${feedback.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status">
          {feedback.kind === 'error' ? <X className="mt-0.5 h-5 w-5 shrink-0" /> : <Check className="mt-0.5 h-5 w-5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}
      {defs?.length ? (
        <div className="space-y-4">
          {defs.map((def) => {
            const draft = drafts[def.keyId] ?? '';
            return (
              <div key={def.keyId} className="grid gap-3 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(260px,1.4fr)_auto] md:items-start">
                <div>
                  <p className="font-medium text-slate-800">{def.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{def.keyId}</p>
                  <p className="mt-1 text-xs text-slate-500">{def.hint}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {def.stored
                      ? <>Stored in database — <span className="font-mono">{def.masked}</span></>
                      : def.configured
                        ? <>Enabled from environment — <span className="font-mono">{def.masked}</span></>
                        : <span className="font-semibold text-amber-600">Not configured yet</span>}
                  </p>
                </div>
                <div>
                  <input
                    type="password"
                    value={draft}
                    onChange={(event) => setDrafts((previous) => ({ ...previous, [def.keyId]: event.target.value }))}
                    placeholder={def.masked || 'Paste your API key'}
                    disabled={!isAdmin}
                    className="w-full border bg-white px-3 py-2 font-mono text-sm disabled:bg-slate-50"
                    aria-label={def.label}
                  />
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => void saveAll ()}
                      disabled={busy || Object.keys(drafts).every((k) => (drafts[k] ?? '').trim().length === 0)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save all
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4" />Admin only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No API key definitions available.</p>
      )}
    </section>
  );
}