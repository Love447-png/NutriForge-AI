import { useMemo, useState } from "react";

function trustScore(agent) {
  const actions = agent.action_count || 0;
  const blocks = agent.block_count || 0;
  if (!actions) return 96;
  return Math.max(18, Math.round(100 - (blocks / actions) * 100));
}

export default function AgentRegistry({
  agents,
  selectedAgent,
  setSelectedAgentId,
  detail,
  loading,
  error,
  onRegister
}) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [showModal, setShowModal] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const filteredAgents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return agents;
    return agents.filter(agent => {
      const haystack = `${agent.name} ${agent.description ?? ""} ${agent.id}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [agents, search]);

  const rosterStats = useMemo(() => {
    return {
      total: agents.length,
      intents: agents.reduce((sum, agent) => sum + (agent.intent_count || 0), 0),
      actions: agents.reduce((sum, agent) => sum + (agent.action_count || 0), 0),
      avgTrust: agents.length ? Math.round(agents.reduce((sum, agent) => sum + trustScore(agent), 0) / agents.length) : 100
    };
  }, [agents]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await onRegister(form.name, form.description);
      setPrivateKey(result.private_key_SAVE_THIS);
      setForm({ name: "", description: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-4">
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Registered Agents", value: rosterStats.total, tone: "text-white" },
              { label: "Issued Intents", value: rosterStats.intents, tone: "text-soc-purple" },
              { label: "Verified Actions", value: rosterStats.actions, tone: "text-soc-cyan" },
              { label: "Avg Trust Score", value: `${rosterStats.avgTrust}%`, tone: "text-emerald-300" }
            ].map(card => (
              <div key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{card.label}</div>
                <div className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Agent Registry</div>
            <h2 className="mt-2 text-2xl font-semibold">Per-agent identity, trust posture, and intent history</h2>
          </div>
          <button
            className="rounded-full bg-soc-cyan px-5 py-2 text-sm font-semibold text-slate-950"
            onClick={() => setShowModal(true)}
          >
            Register New Agent
          </button>
        </div>
        <div className="mb-5">
          <input
            className="w-full rounded-2xl border border-soc-border bg-slate-950/40 px-4 py-3 text-sm outline-none"
            placeholder="Search by agent name, description, or ID..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        {loading ? <div className="rounded-2xl border border-soc-border p-4 text-slate-400">Loading agent registry...</div> : null}
        {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
        {!loading && !error ? (
          <div className="overflow-hidden rounded-2xl border border-soc-border">
            <table className="min-w-full divide-y divide-soc-border text-left text-sm">
              <thead className="bg-slate-950/30 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Agent ID</th>
                  <th className="px-4 py-3">Public Key</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Intents</th>
                  <th className="px-4 py-3">Actions</th>
                  <th className="px-4 py-3">Trust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soc-border">
                {filteredAgents.map(agent => (
                  <tr
                    key={agent.id}
                    className={`cursor-pointer transition hover:bg-white/5 ${selectedAgent?.id === agent.id ? "bg-white/5" : ""}`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <td className="px-4 py-3">{agent.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{agent.id.slice(0, 12)}...</td>
                    <td className="px-4 py-3 font-mono text-xs">{agent.public_key.slice(0, 16)}...</td>
                    <td className="px-4 py-3">{new Date(agent.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{agent.intent_count}</td>
                    <td className="px-4 py-3">{agent.action_count}</td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                          <span>{trustScore(agent)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${trustScore(agent) > 80 ? "bg-emerald-400" : trustScore(agent) > 50 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${trustScore(agent)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-5">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Agent Detail</div>
        {!detail ? (
          <div className="mt-4 rounded-2xl border border-dashed border-soc-border p-6 text-slate-400">
            Select an agent to inspect public keys and intent history.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-semibold">{detail.agent.name}</div>
                  <div className="mt-2 text-sm text-slate-400">{detail.agent.description}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Trust score</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-300">{trustScore(detail.agent)}%</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Intents</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{detail.agent.intent_count}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Actions</div>
                  <div className="mt-2 text-2xl font-semibold text-soc-cyan">{detail.agent.action_count}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Blocks</div>
                  <div className="mt-2 text-2xl font-semibold text-red-300">{detail.agent.block_count}</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-slate-950/40 p-3 font-mono text-xs text-slate-300 break-all">
                {detail.agent.public_key}
              </div>
            </div>
            <div className="space-y-3">
              {detail.intents.map(intent => (
                <div key={intent.id} className="rounded-2xl border border-soc-border p-4">
                  <div className="font-medium">{intent.original_intent_text}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {intent.allowed_action_types.map(action => (
                      <span key={action} className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                        {action}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {intent.forbidden_targets.map(target => (
                      <span key={target} className="rounded-full bg-red-500/10 px-3 py-1 font-mono text-xs text-red-200">
                        {target}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Expires {new Date(intent.expires_at * 1000).toLocaleString()} · actions {intent.action_count} · blocked {intent.block_count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Register Agent</div>
                <h3 className="mt-2 text-xl font-semibold">Mint a new Ed25519 identity</h3>
              </div>
              <button className="text-slate-400" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <input
                className="w-full rounded-2xl border border-soc-border bg-slate-950/40 px-4 py-3 outline-none"
                placeholder="Agent name"
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
              />
              <textarea
                className="h-28 w-full rounded-2xl border border-soc-border bg-slate-950/40 px-4 py-3 outline-none"
                placeholder="Description"
                value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
              />
              <button className="rounded-full bg-soc-cyan px-5 py-2 text-sm font-semibold text-slate-950" disabled={submitting}>
                {submitting ? "Registering..." : "Register Agent"}
              </button>
            </form>
            {privateKey ? (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="text-sm font-semibold text-amber-200">WARNING: Save this private key. It will never be shown again.</div>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950/70 p-4 font-mono text-xs text-white">{privateKey}</pre>
                <button
                  className="mt-3 rounded-full border border-amber-300/30 px-4 py-2 text-sm text-amber-100"
                  onClick={() => navigator.clipboard.writeText(privateKey)}
                >
                  Copy Private Key
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
