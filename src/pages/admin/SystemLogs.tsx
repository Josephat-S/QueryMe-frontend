import React from 'react';

const mockLogs = [
  { id: 1, time: '10:45:02 AM', level: 'INFO', module: 'Auth', message: 'User teacher1@uni.edu successfully authenticated.' },
  { id: 2, time: '10:44:15 AM', level: 'INFO', module: 'Sandbox', message: 'Schema exam_42_student_102 created and seeded in 420ms.' },
  { id: 3, time: '10:41:00 AM', level: 'WARN', module: 'QueryEngine', message: 'Student 102 query execution hit 5000ms timeout threshold. Process killed.' },
  { id: 4, time: '10:35:10 AM', level: 'ERROR', module: 'Auth', message: 'Invalid JWT signature detected from IP 192.168.1.44.' },
  { id: 5, time: '10:30:00 AM', level: 'INFO', module: 'Exam', message: 'Exam "Advanced SQL Joins" published by Prof. Smith.' },
  { id: 6, time: '10:25:44 AM', level: 'INFO', module: 'Sandbox', message: 'Cleanup scheduler successfully dropped 12 zombie schemas.' },
];

const SystemLogs: React.FC = () => {
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>System Logs</h1>
          <p>Real-time audit trails and service logs across the monolith module boundaries.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm">Export CSV</button>
          <button className="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 2v6h6"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
           {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map(level => (
             <button key={level} className={`btn btn-sm ${level === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}>
               {level}
             </button>
           ))}
           <select className="form-input" style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e8e8ee', fontSize: '12px' }}>
             <option value="all">Module: All Modules</option>
             <option value="auth">Auth Module</option>
             <option value="sandbox">Sandbox Manager</option>
             <option value="query">Query Engine</option>
           </select>
        </div>
        
        <div className="content-card-body" style={{ padding: 0 }}>
          <div style={{ background: '#1e1e2e', minHeight: '60vh', padding: '16px', fontFamily: 'Courier New, monospace', fontSize: '13px', color: '#a6e3a1', overflowX: 'auto' }}>
            {mockLogs.map(log => (
              <div key={log.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '16px' }}>
                <span style={{ color: '#6c7086', flexShrink: 0 }}>[{log.time}]</span>
                <span style={{ 
                  color: log.level === 'ERROR' ? '#f38ba8' : log.level === 'WARN' ? '#f9e2af' : '#89b4fa', 
                  fontWeight: 'bold', width: '50px', flexShrink: 0 
                }}>
                  {log.level}
                </span>
                <span style={{ color: '#cba6f7', width: '100px', flexShrink: 0 }}>[{log.module}]</span>
                <span style={{ color: log.level === 'ERROR' ? '#f38ba8' : '#cdd6f4' }}>{log.message}</span>
              </div>
            ))}
            <div style={{ padding: '6px 0', color: '#6c7086', display: 'flex', gap: '8px', alignItems: 'center' }}>
               <span className="spinner" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a6e3a1', display: 'inline-block' }} /> 
               Waiting for new logs...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
