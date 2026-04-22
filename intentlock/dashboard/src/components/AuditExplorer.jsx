import { useDeferredValue, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import MerkleTreeViz from "./MerkleTreeViz";

export default function AuditExplorer({ auditEntries, leaves, root, loading, error }) {
  const [decision, setDecision] = useState("ALL");
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredEntries = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    return auditEntries.filter(entry => {
      const matchesDecision = decision === "ALL" ? true : entry.decision === decision;
      const haystack = `${entry.action_type} ${entry.action_description} ${entry.reason} ${entry.agent_id}`.toLowerCase();
      const matchesSearch = normalized ? haystack.includes(normalized) : true;
      return matchesDecision && matchesSearch;
    });
  }, [auditEntries, decision, deferredSearch]);

  const decisionDistribution = useMemo(() => {
    const allow = auditEntries.filter(entry => entry.decision === "ALLOW").length;
    const block = auditEntries.filter(entry => entry.decision === "BLOCK").length;
    return [
      { name: "ALLOW", value: allow },
      { name: "BLOCK", value: block }
    ];
  }, [auditEntries]);

  const selectedAuditEntry = useMemo(() => {
    if (!selectedNode) return null;
    return auditEntries.find(entry => entry.id === selectedNode.id) ?? null;
  }, [auditEntries, selectedNode]);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-4">
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Merkle Audit Explorer</div>
          <h2 className="mt-2 text-2xl font-semibold">Tamper-evident verification trail</h2>
          <div className="mt-4 text-sm text-slate-400">
            Root hash {root?.root_hash ?? "pending"} · entries {root?.total_entries ?? 0}
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <MerkleTreeViz leaves={leaves} root={root} onSelect={setSelectedNode} />
            <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Decision Distribution</div>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={decisionDistribution}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.96)",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        borderRadius: "18px"
                      }}
                    />
                    <Bar dataKey="value" fill="#06b6d4" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-400">Filter decision</div>
            {["ALL", "ALLOW", "BLOCK"].map(option => (
              <button
                key={option}
                className={`rounded-full px-4 py-2 text-sm ${decision === option ? "bg-soc-cyan text-slate-950" : "border border-soc-border text-slate-300"}`}
                onClick={() => setDecision(option)}
              >
                {option}
              </button>
            ))}
            <input
              className="min-w-[260px] flex-1 rounded-2xl border border-soc-border bg-slate-950/40 px-4 py-2.5 text-sm outline-none"
              placeholder="Search by action, reason, or agent..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          {loading ? <div className="rounded-2xl border border-soc-border p-4 text-slate-400">Loading audit log...</div> : null}
          {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          {!loading && !error ? (
            <div className="overflow-hidden rounded-2xl border border-soc-border">
              <table className="min-w-full divide-y divide-soc-border text-left text-sm">
                <thead className="bg-slate-950/30 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">{new Date(entry.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{entry.agent_id.slice(0, 12)}...</td>
                      <td className="px-4 py-3">{entry.action_type}</td>
                      <td className="max-w-xs truncate px-4 py-3">{entry.action_description}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs ${entry.decision === "BLOCK" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                          {entry.decision}
                        </span>
                      </td>
                      <td className="px-4 py-3">{entry.semantic_score?.toFixed?.(2) ?? "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="glass-panel rounded-[2rem] p-5">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Selected Node</div>
        {!selectedNode ? (
          <div className="mt-4 rounded-2xl border border-dashed border-soc-border p-6 text-slate-400">
            Hover or click a hex node to inspect its hash lineage.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <div className="font-medium">Hash fragment</div>
              <div className="mt-2 rounded-2xl bg-slate-950/40 p-4 font-mono text-xs text-slate-200 break-all">
                {selectedNode.hash}
              </div>
            </div>
            <div className="text-sm text-slate-400">Decision affinity: {selectedNode.decision}</div>
            {selectedAuditEntry ? (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Audit Entry Detail</div>
                <div className="text-lg font-medium text-white">{selectedAuditEntry.action_description}</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/10 px-3 py-1">{selectedAuditEntry.action_type}</span>
                  <span className={`rounded-full px-3 py-1 ${selectedAuditEntry.decision === "BLOCK" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {selectedAuditEntry.decision}
                  </span>
                </div>
                <div className="text-sm text-slate-300">{selectedAuditEntry.reason}</div>
                <div className="rounded-2xl bg-slate-950/40 p-3 font-mono text-xs text-slate-300 break-all">
                  {selectedAuditEntry.merkle_leaf_hash}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </section>
  );
}
