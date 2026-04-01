import React, { useState, useEffect } from 'react';
import './TeacherPages.css';

type SessionStatus = 'in_progress' | 'submitted' | 'expired';

interface ExamSession {
  id: string;
  studentName: string;
  studentEmail: string;
  examTitle: string;
  startedAt: Date;
  submittedAt: Date | null;
  expiresAt: Date;
  sandboxSchema: string;
  status: SessionStatus;
}

const mockSessions: ExamSession[] = [
  { id: '1', studentName: 'Alice Johnson',  studentEmail: 'alice@uni.edu',   examTitle: 'SQL Midterm – DB 101', startedAt: new Date(Date.now() - 22 * 60000), submittedAt: null,                       expiresAt: new Date(Date.now() + 68 * 60000), sandboxSchema: 'sandbox_a1b2', status: 'in_progress' },
  { id: '2', studentName: 'Bob Williams',   studentEmail: 'bob@uni.edu',     examTitle: 'SQL Midterm – DB 101', startedAt: new Date(Date.now() - 55 * 60000), submittedAt: new Date(Date.now() - 5 * 60000), expiresAt: new Date(Date.now() + 35 * 60000), sandboxSchema: 'sandbox_c3d4', status: 'submitted'  },
  { id: '3', studentName: 'Carol Smith',    studentEmail: 'carol@uni.edu',   examTitle: 'SQL Midterm – DB 101', startedAt: new Date(Date.now() - 18 * 60000), submittedAt: null,                       expiresAt: new Date(Date.now() + 72 * 60000), sandboxSchema: 'sandbox_e5f6', status: 'in_progress' },
  { id: '4', studentName: 'Daniel Okafor',  studentEmail: 'daniel@uni.edu',  examTitle: 'SQL Midterm – DB 101', startedAt: new Date(Date.now() - 91 * 60000), submittedAt: null,                       expiresAt: new Date(Date.now() - 1 * 60000),  sandboxSchema: 'sandbox_g7h8', status: 'expired'    },
  { id: '5', studentName: 'Eva Martinez',   studentEmail: 'eva@uni.edu',     examTitle: 'SQL Midterm – DB 101', startedAt: new Date(Date.now() - 40 * 60000), submittedAt: new Date(Date.now() - 12 * 60000),expiresAt: new Date(Date.now() + 50 * 60000), sandboxSchema: 'sandbox_i9j0', status: 'submitted'  },
  { id: '6', studentName: 'Frank Chen',     studentEmail: 'frank@uni.edu',   examTitle: 'SQL Midterm – DB 101', startedAt: new Date(Date.now() - 5 * 60000),  submittedAt: null,                       expiresAt: new Date(Date.now() + 85 * 60000), sandboxSchema: 'sandbox_k1l2', status: 'in_progress' },
];

const fmt = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const countdown = (expiresAt: Date, currentNowMs: number) => {
  const diff = Math.max(0, Math.floor((expiresAt.getTime() - currentNowMs) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const elapsed = (startedAt: Date, currentNowMs: number) => {
  const diff = Math.floor((currentNowMs - startedAt.getTime()) / 60000);
  return `${diff}m ago`;
};

const statusConfig: Record<SessionStatus, { label: string; cls: string }> = {
  in_progress: { label: '🟢 In Progress', cls: 'sess-status-active' },
  submitted:   { label: '✅ Submitted',   cls: 'sess-status-submitted' },
  expired:     { label: '🔴 Expired',     cls: 'sess-status-expired' },
};

type FilterType = 'all' | SessionStatus;

const ExamSessionsMonitor: React.FC = () => {
  const [sessions, setSessions] = useState<ExamSession[]>(mockSessions);
  const [filter, setFilter] = useState<FilterType>('all');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  // Tick every second to update countdowns
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    // In production: re-fetch from backend here
  };

  const handleForceSubmit = (id: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, status: 'submitted', submittedAt: new Date() } : s
      )
    );
  };

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);
  const counts = {
    all:         sessions.length,
    in_progress: sessions.filter(s => s.status === 'in_progress').length,
    submitted:   sessions.filter(s => s.status === 'submitted').length,
    expired:     sessions.filter(s => s.status === 'expired').length,
  };

  return (
    <div className="teacher-page" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="builder-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h1 className="builder-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Exam Sessions Monitor
          </h1>
          <span className="sess-live-dot" title="Live">
            <span className="sess-live-pulse" />
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>
            Last refreshed: {fmt(lastRefresh)}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stat bar */}
        <div className="sess-stat-bar">
          {(['all', 'in_progress', 'submitted', 'expired'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`sess-stat-pill${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              <span className={`sess-stat-num sess-stat-${f === 'all' ? 'all' : f}`}>
                {counts[f as keyof typeof counts]}
              </span>
              <span className="sess-stat-label">
                {f === 'all' ? 'All Sessions' : f === 'in_progress' ? 'In Progress' : f === 'submitted' ? 'Submitted' : 'Expired'}
              </span>
            </button>
          ))}
        </div>

        {/* Sessions table */}
        <div className="builder-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="sess-table-header">
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              {filter === 'all' ? 'All Sessions' : statusConfig[filter as SessionStatus]?.label} — {filtered.length} session{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="students-empty" style={{ padding: '60px 20px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <p>No sessions match this filter.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sess-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Submitted</th>
                    <th>Time Remaining</th>
                    <th>Sandbox</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className={s.status === 'expired' ? 'sess-row-expired' : ''}>
                      <td>
                        <div className="sess-student-cell">
                          <span className="sess-avatar">{s.studentName[0]}</span>
                          <div>
                            <div className="sess-student-name">{s.studentName}</div>
                            <div className="sess-student-email">{s.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`sess-status-chip ${statusConfig[s.status].cls}`}>
                          {statusConfig[s.status].label}
                        </span>
                      </td>
                      <td>
                        <div className="sess-time-cell">
                          <span className="sess-time-main">{fmt(s.startedAt)}</span>
                          <span className="sess-time-sub">{elapsed(s.startedAt, nowMs)}</span>
                        </div>
                      </td>
                      <td>
                        {s.submittedAt ? (
                          <div className="sess-time-cell">
                            <span className="sess-time-main">{fmt(s.submittedAt)}</span>
                            <span className="sess-time-sub" style={{ color: '#38a169' }}>Submitted</span>
                          </div>
                        ) : (
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {/* Only show countdown for in-progress */}
                        {s.status === 'in_progress' ? (
                          <span
                            className="sess-countdown"
                            style={{ color: (s.expiresAt.getTime() - nowMs) < 10 * 60000 ? '#e53e3e' : '#2d3748' }}
                          >
                            {countdown(s.expiresAt, nowMs)}
                          </span>
                        ) : s.status === 'expired' ? (
                          <span style={{ color: '#e53e3e', fontSize: '12px', fontWeight: 600 }}>Expired</span>
                        ) : (
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="sess-sandbox-badge">{s.sandboxSchema}</span>
                      </td>
                      <td>
                        {s.status === 'in_progress' && (
                          <button
                            className="sess-force-btn"
                            onClick={() => handleForceSubmit(s.id)}
                            title="Force submit this session"
                          >
                            Force Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="sess-legend">
          <span>⚠️ Sessions with &lt;10 min remaining are shown in red.</span>
          <span>Auto-refresh is live (countdowns update every second).</span>
          <span>Connect to <code>exam_sessions</code> table to replace mock data.</span>
        </div>
      </div>
    </div>
  );
};

export default ExamSessionsMonitor;
