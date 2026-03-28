import React, { useState, useRef, useEffect } from 'react';

type LogLevel = 'ALL' | 'INFO' | 'WARN' | 'ERROR';
type ModuleFilter = 'all' | 'auth' | 'sandbox' | 'query' | 'exam' | 'results';

interface LogEntry {
  id: number;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  message: string;
}

let nextId = 7;

const ALL_LOGS: LogEntry[] = [
  { id: 1,  time: '10:45:02 AM', level: 'INFO',  module: 'Auth',        message: 'User teacher1@uni.edu successfully authenticated.' },
  { id: 2,  time: '10:44:15 AM', level: 'INFO',  module: 'Sandbox',     message: 'Schema exam_42_student_102 created and seeded in 420ms.' },
  { id: 3,  time: '10:41:00 AM', level: 'WARN',  module: 'QueryEngine', message: 'Student 102 query execution hit 5000ms timeout threshold. Process killed.' },
  { id: 4,  time: '10:35:10 AM', level: 'ERROR', module: 'Auth',        message: 'Invalid JWT signature detected from IP 192.168.1.44.' },
  { id: 5,  time: '10:30:00 AM', level: 'INFO',  module: 'Exam',        message: 'Exam "Advanced SQL Joins" published by Prof. Smith.' },
  { id: 6,  time: '10:25:44 AM', level: 'INFO',  module: 'Sandbox',     message: 'Cleanup scheduler successfully dropped 12 zombie schemas.' },
];

const STREAM_POOL: Omit<LogEntry, 'id' | 'time'>[] = [
  { level: 'INFO',  module: 'Auth',        message: 'User student@queryme.com authenticated — session token issued.' },
  { level: 'INFO',  module: 'Sandbox',     message: 'Sandbox exam_51_student_205 provisioned in 310ms.' },
  { level: 'WARN',  module: 'QueryEngine', message: 'Query plan fallback triggered for student 38 — sequential scan on large dataset.' },
  { level: 'ERROR', module: 'Results',     message: 'Grading job for exam_48 failed: reference query returned no rows.' },
  { level: 'INFO',  module: 'Exam',        message: 'Exam "Window Functions Mastery" moved to CLOSED status automatically.' },
  { level: 'WARN',  module: 'Auth',        message: 'Rate limit exceeded for IP 10.0.0.91 — 20 failed login attempts.' },
  { level: 'INFO',  module: 'Sandbox',     message: 'Auto-cleanup: 5 zombie schemas dropped in 112ms.' },
  { level: 'ERROR', module: 'QueryEngine', message: 'Connection from pool exhausted — request queued for 3200ms.' },
];

const getTime = () => new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

const MODULE_COLORS: Record<string, string> = {
  Auth: '#f0abfc',
  Sandbox: '#93c5fd',
  QueryEngine: '#fbbf24',
  Exam: '#a3e635',
  Results: '#34d399',
};

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(ALL_LOGS);
  const [levelFilter, setLevelFilter] = useState<LogLevel>('ALL');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [streaming, setStreaming] = useState(true);
  const [streamPoolIndex, setStreamPoolIndex] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // stream simulation
  useEffect(() => {
    if (!streaming) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const entry = STREAM_POOL[streamPoolIndex % STREAM_POOL.length];
      const newLog: LogEntry = { ...entry, id: nextId++, time: getTime() };
      setLogs(prev => [...prev, newLog]);
      setStreamPoolIndex(i => i + 1);
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [streaming, streamPoolIndex]);

  const filteredLogs = logs.filter(l => {
    const matchLevel = levelFilter === 'ALL' || l.level === levelFilter;
    const matchModule = moduleFilter === 'all' || l.module.toLowerCase().replace('engine','').replace('queryengine','query') === moduleFilter;
    const matchSearch = !searchText || l.message.toLowerCase().includes(searchText.toLowerCase()) || l.module.toLowerCase().includes(searchText.toLowerCase());
    return matchLevel && matchModule && matchSearch;
  });

  const handleClear = () => {
    if (window.confirm('Clear all displayed logs? This only clears the UI view.')) setLogs([]);
  };

  const handleExportCSV = () => {
    const header = 'Time,Level,Module,Message\n';
    const rows = filteredLogs.map(l => `"${l.time}","${l.level}","${l.module}","${l.message}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'queryme_logs.csv'; a.click();
  };

  const handleRefresh = () => {
    setLogs([...ALL_LOGS]);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>System Logs</h1>
          <p>Real-time audit trails and service logs across the monolith module boundaries.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={handleClear}>Clear View</button>
          <button
            className={`btn btn-sm ${streaming ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStreaming(s => !s)}
          >
            {streaming ? '⏸ Pause Stream' : '▶ Resume Stream'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleRefresh}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 2v6h6"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="content-card">
        {/* Filters */}
        <div className="content-card-header" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as LogLevel[]).map(level => (
              <button
                key={level}
                className={`btn btn-sm ${levelFilter === level ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setLevelFilter(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="Search logs..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ padding: '5px 12px', fontSize: '12px', width: '180px' }}
          />

          <select
            className="form-input"
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value as ModuleFilter)}
            style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '12px' }}
          >
            <option value="all">Module: All Modules</option>
            <option value="auth">Auth Module</option>
            <option value="sandbox">Sandbox Manager</option>
            <option value="query">Query Engine</option>
            <option value="exam">Exam Module</option>
            <option value="results">Results Module</option>
          </select>

          <span style={{ fontSize: '11px', opacity: 0.6 }}>{filteredLogs.length} entries</span>
        </div>

        {/* Terminal body */}
        <div className="content-card-body" style={{ padding: 0 }}>
          <div style={{
            background: '#0d1117',
            minHeight: '60vh',
            maxHeight: '65vh',
            padding: '16px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '12.5px',
            color: '#c9d1d9',
            overflowY: 'auto',
            overflowX: 'auto',
          }}>
            {filteredLogs.length === 0 && (
              <div style={{ color: '#6e7681', padding: '24px', textAlign: 'center' }}>No log entries match your filters.</div>
            )}
            {filteredLogs.map(log => (
              <div
                key={log.id}
                style={{
                  padding: '5px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex',
                  gap: '12px',
                  lineHeight: '1.5',
                }}
              >
                <span style={{ color: '#484f58', flexShrink: 0, minWidth: '90px' }}>[{log.time}]</span>
                <span style={{
                  fontWeight: 700,
                  width: '46px',
                  flexShrink: 0,
                  color: log.level === 'ERROR' ? '#f85149' : log.level === 'WARN' ? '#d29922' : '#58a6ff',
                }}>
                  {log.level}
                </span>
                <span style={{
                  color: MODULE_COLORS[log.module] || '#8b949e',
                  width: '110px',
                  flexShrink: 0,
                }}>
                  [{log.module}]
                </span>
                <span style={{ color: log.level === 'ERROR' ? '#ffa198' : log.level === 'WARN' ? '#e3b341' : '#c9d1d9' }}>
                  {log.message}
                </span>
              </div>
            ))}
            {streaming && (
              <div style={{ padding: '6px 0', color: '#3fb950', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Streaming live logs...
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
