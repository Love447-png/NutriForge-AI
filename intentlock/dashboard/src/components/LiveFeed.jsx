import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, CartesianGrid, XAxis, YAxis } from "recharts";

function progressWidth(score) {
  return `${Math.max(0, Math.min(score ?? 0, 1)) * 100}%`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString();
}

export default function LiveFeed({ events, paused, setPaused, stats, connectionStatus, trendData, selectedAgentDetail }) {
  const scrollRef = useRef(null);
  const [eventFilter, setEventFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (paused) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [events, paused]);

  const sortedEvents = useMemo(() => [...events].reverse(), [events]);
  const filteredEvents = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return sortedEvents.filter(event => {
      const matchesType = eventFilter === "ALL" ? true : event.type === eventFilter;
      const haystack = JSON.stringify(event.data ?? {}).toLowerCase();
      const matchesSearch = normalized ? haystack.includes(normalized) || event.type.toLowerCase().includes(normalized) : true;
      return matchesType && matchesSearch;
    });
  }, [eventFilter, searchQuery, sortedEvents]);

  const activeIntent = selectedAgentDetail?.intents?.[0];
  const latestBlocked = filteredEvents.find(event => event.type === "ACTION_BLOCKED");

  return (
    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-4">
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Live Verification Stream</div>
              <h2 className="mt-2 text-2xl font-semibold">Operator timeline for every authorized or blocked action</h2>
              <div className="mt-2 text-sm text-slate-400">
                Filter the stream by event class, search through action descriptions, and watch suspicious branches escalate in real time.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${connectionStatus === "CONNECTED" ? "animate-pulseDot bg-emerald-400" : "bg-slate-500"}`} />
              <div className="text-right">
                <div className="text-sm font-medium">{connectionStatus}</div>
                <div className="text-xs text-slate-400">WebSocket telemetry</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input
              className="w-full rounded-2xl border border-soc-border bg-slate-950/40 px-4 py-3 text-sm outline-none ring-0"
              placeholder="Search by action, target, reason, or agent..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {["ALL", "ACTION_VERIFIED", "ACTION_BLOCKED", "INTENT_LOCKED"].map(option => (
                <button
                  key={option}
                  className={`rounded-full px-4 py-2 text-xs tracking-[0.2em] ${eventFilter === option ? "bg-soc-cyan text-slate-950" : "border border-soc-border text-slate-300"}`}
                  onClick={() => setEventFilter(option)}
                >
                  {option.replaceAll("_", " ")}
                </button>
              ))}
            </div>
            <button
              className="rounded-full border border-soc-border px-4 py-2 text-sm text-slate-200 transition hover:border-soc-cyan hover:text-soc-cyan"
              onClick={() => setPaused(current => !current)}
            >
              {paused ? "Resume Scroll" : "Pause Scroll"}
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="glass-panel h-[calc(100vh-24rem)] overflow-y-auto rounded-[2rem] p-4">
          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-soc-border p-8 text-center text-slate-400">
              No events match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event, index) => {
              const data = event.data ?? {};
              const isBlocked = event.type === "ACTION_BLOCKED";
              const isIntent = event.type === "INTENT_LOCKED";
              const borderTone = isBlocked ? "border-l-soc-red" : isIntent ? "border-l-soc-purple" : "border-l-emerald-400";
              const flashClass = isBlocked ? "flash-blocked animate-blocked-shake" : "";
              return (
                <article
                  key={`${event.timestamp}-${index}`}
                  className={`glass-panel rounded-2xl border-l-4 ${borderTone} ${flashClass} p-5`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{event.type.replaceAll("_", " ")}</span>
                        {isBlocked ? (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">BLOCKED</span>
                        ) : null}
                      </div>
                      <div className="text-lg font-semibold text-white">
                        {data.action_description ?? data.original_intent_text ?? data.name ?? "IntentLock event"}
                      </div>
                      <div className="text-sm text-slate-400">
                        Agent: {data.agent_name ?? data.name ?? data.agent_id ?? "Unknown agent"}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                        {data.action_type ? <span className="rounded-full border border-white/10 px-3 py-1">{data.action_type}</span> : null}
                        {data.action_target ? <span className="rounded-full border border-white/10 px-3 py-1">{data.action_target}</span> : null}
                        {data.merkle_root ? <span className="rounded-full border border-white/10 px-3 py-1 font-mono">root {String(data.merkle_root).slice(0, 10)}...</span> : null}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{formatTime(event.timestamp)}</div>
                  </div>

                  {typeof data.semantic_score === "number" ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>Semantic score</span>
                        <span>{data.semantic_score.toFixed(2)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="progress-bar h-full rounded-full" style={{ width: progressWidth(data.semantic_score) }} />
                      </div>
                    </div>
                  ) : null}

                  {isIntent ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(data.allowed_action_types ?? []).map(item => (
                        <span key={item} className="rounded-full bg-soc-purple/20 px-3 py-1 text-xs text-soc-purple">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 text-sm text-slate-300">{data.reason ?? "Cryptographically anchored to the approved intent."}</div>
                </article>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="glass-panel rounded-[2rem] p-5">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Alignment Pulse</div>
          <div className="mt-2 text-xl font-semibold">Decision pressure over recent verifier activity</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="liveFeedScoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="tick" tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis tickLine={false} axisLine={false} stroke="#64748b" domain={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.96)",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                    borderRadius: "18px"
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#liveFeedScoreFill)" strokeWidth={3} />
                <Area type="stepAfter" dataKey="blocks" stroke="#ef4444" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-5">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Threat Spotlight</div>
          {latestBlocked ? (
            <div className="mt-4 rounded-3xl border border-red-500/30 bg-red-500/[0.08] p-4">
              <div className="text-sm font-semibold text-red-200">Most recent blocked branch</div>
              <div className="mt-3 text-lg font-medium text-white">{latestBlocked.data?.action_description}</div>
              <div className="mt-3 text-sm text-red-100">{latestBlocked.data?.reason}</div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-100">
              No blocked actions in the current filtered stream.
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[2rem] p-5">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Intent Context</div>
          {activeIntent ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-lg font-medium text-white">{activeIntent.original_intent_text}</div>
                <div className="mt-2 text-sm text-slate-400">
                  Expires {new Date(activeIntent.expires_at * 1000).toLocaleString()} · actions {activeIntent.action_count} · blocks {activeIntent.block_count}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeIntent.allowed_action_types.map(item => (
                  <span key={item} className="rounded-full bg-soc-purple/15 px-3 py-1 text-xs text-soc-purple">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-soc-border p-4 text-sm text-slate-400">
              Select an agent with live intents to inspect its latest authorization envelope.
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
