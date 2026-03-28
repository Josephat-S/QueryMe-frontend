import React, { useState } from 'react';
import { useToast } from '../../components/ToastProvider';

const SystemSettings: React.FC = () => {
  const { showToast, confirm } = useToast();
  const [cleanSandboxes, setCleanSandboxes] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [activeExams, setActiveExams] = useState([
    { id: 101, title: 'Midterm SQL Joins', course: 'Database Systems 101', status: 'Active', submissions: 34 },
    { id: 102, title: 'Final Aggregations', course: 'Data Management', status: 'Active', submissions: 12 },
    { id: 103, title: 'Window Functions Quiz', course: 'Advanced SQL Masters', status: 'Draft', submissions: 0 },
  ]);

  const handleDeleteExam = async (id: number, title: string) => {
    const ok = await confirm({
      title: 'Delete Exam',
      message: `Permanently delete "${title}"? All associated sandbox schemas and student results will be destroyed.`,
      confirmLabel: 'Delete Exam',
      danger: true,
    });
    if (ok) {
      setActiveExams(activeExams.filter(exam => exam.id !== id));
      showToast('success', 'Exam Deleted', `"${title}" and its data have been removed.`);
    }
  };

  const handleCleanSandboxes = () => {
    setCleanSandboxes(true);
    setTimeout(() => {
      setCleanSandboxes(false);
      showToast('success', 'Cleanup Complete', '2 zombie schemas were successfully dropped.');
    }, 1500);
  };

  const handleDestroyAll = async () => {
    const ok = await confirm({
      title: 'Destroy ALL Sandboxes',
      message: 'This will immediately drop all active postgres schemas, interrupting any live exams. This action cannot be undone.',
      confirmLabel: 'Destroy All',
      danger: true,
    });
    if (ok) showToast('error', 'All Sandboxes Destroyed', 'Every active schema has been dropped from the database.');
  };

  return (
    <div>
      <div className="page-header">
        <h1>System Settings & Health</h1>
        <p>Monitor platform infrastructure and manage core system state</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '22px' }}>
        
        {/* Sandbox Management */}
        <div className="content-card">
          <div className="content-card-header">
            <h2>🛡 Sandbox Infrastructure</h2>
          </div>
          <div className="content-card-body">
            <div className="sandbox-panel" style={{ padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 600 }}>
                 <span>Active postgres schemas:</span>
                 <span style={{ color: '#3182ce' }}>8</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: 600 }}>
                 <span>Zombie sandboxes (failed cleanup):</span>
                 <span style={{ color: '#e53e3e' }}>2</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                 <span>Current auto-cleanup interval:</span>
                 <span style={{ color: '#38a169' }}>Every 15 mins</span>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleCleanSandboxes}
               >
                 {cleanSandboxes ? '⏳ Forcing Cleanup...' : '🧹 Force Cleanup Zombie Sandboxes'}
               </button>
               <button className="btn btn-secondary" onClick={handleDestroyAll} style={{ width: '100%', justifyContent: 'center', color: '#e53e3e', border: '1px solid rgba(229,62,62,0.2)' }}>
                 🔥 Destroy ALL Active Sandboxes (Emergency)
               </button>
               <p style={{ fontSize: '11px', textAlign: 'center', margin: 0 }}>
                 Warning: This will immediately drop schemas for any active exams.
               </p>
            </div>
          </div>
        </div>

        {/* Global Platform Settings */}
        <div className="content-card">
          <div className="content-card-header">
            <h2>⚙️ Platform Controls</h2>
          </div>
          <div className="content-card-body">
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border, #e8e8ee)' }}>
                <div>
                   <h3 style={{ fontSize: '14px', margin: '0 0 4px' }}>Maintenance Mode</h3>
                   <p style={{ fontSize: '11px', margin: 0 }}>Disables student and teacher login. Admins only.</p>
                </div>
                <div style={{ position: 'relative' }}>
                   <input type="checkbox" id="maint-toggle" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} style={{ display: 'none' }} />
                   <label htmlFor="maint-toggle" style={{ 
                      display: 'block', width: '44px', height: '24px', 
                      background: maintenanceMode ? '#e53e3e' : '#cbd5e1', 
                      borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s'
                   }}>
                      <div style={{ 
                         width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                         position: 'absolute', top: '2px', left: maintenanceMode ? '22px' : '2px', transition: 'left 0.3s'
                      }} />
                   </label>
                </div>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border, #e8e8ee)' }}>
                <div>
                   <h3 style={{ fontSize: '14px', margin: '0 0 4px' }}>Registration Status</h3>
                   <p style={{ fontSize: '11px', margin: 0 }}>Allow teachers to register new students.</p>
                </div>
                <span className="badge badge-green">OPEN</span>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                <div>
                   <h3 style={{ fontSize: '14px', margin: '0 0 4px' }}>Default Student Quota</h3>
                   <p style={{ fontSize: '11px', margin: 0 }}>Storage limit per sandbox schema</p>
                </div>
                <strong style={{ fontSize: '14px' }}>50 MB</strong>
             </div>
          </div>
        </div>

        {/* Global Exam Management */}
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>🗑️ Global Exam Management</h2>
          </div>
          <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Course Association</th>
                  <th>Status</th>
                  <th>Submissions</th>
                  <th>Danger Zone</th>
                </tr>
              </thead>
              <tbody>
                {activeExams.length > 0 ? activeExams.map(exam => (
                  <tr key={exam.id}>
                    <td style={{ fontWeight: 600 }}>{exam.title}</td>
                    <td>{exam.course}</td>
                    <td>
                      <span className={`badge ${exam.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                        {exam.status}
                      </span>
                    </td>
                    <td>{exam.submissions}</td>
                    <td>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                        style={{ color: '#e53e3e', background: 'rgba(229, 62, 62, 0.1)', border: 'none' }}
                      >
                        Delete Exam
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                      No active exams exist on the platform.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advanced Query Engine Configurations */}
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>⚙️ Advanced Query Engine Configurations</h2>
          </div>
          <div className="content-card-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '22px' }}>
             
             <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Security Blocklist (Comma-separated)</label>
                <p style={{ fontSize: '11px', margin: '0 0 12px' }}>Student queries containing these SQL keywords will be blocked by the validator.</p>
                <textarea 
                  className="form-input" 
                  defaultValue="pg_sleep, pg_cancel_backend, pg_terminate_backend, drop database, truncate, grant, revoke"
                  style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #e8e8ee', fontFamily: 'Courier New, monospace', fontSize: '12px' }}
                />
             </div>

             <div>
                <div style={{ marginBottom: '18px' }}>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Execution Hard Timeout Limit (ms)</label>
                   <p style={{ fontSize: '11px', margin: '0 0 12px' }}>Maximum milliseconds the Query Engine will allow a student query to run before force-terminating.</p>
                   <div style={{ display: 'flex', gap: '8px' }}>
                     <input type="number" defaultValue={5000} className="form-input" style={{ width: '120px', padding: '8px 12px', borderRadius: '8px' }} />
                     <button className="btn btn-secondary">Update Config</button>
                   </div>
                </div>

                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Database Connection Pool</label>
                   <p style={{ fontSize: '11px', margin: '0 0 12px' }}>Maximum HikariCP connections allowed simultaneously for the queryme_sandbox database.</p>
                   <select className="form-input" defaultValue="100" style={{ padding: '8px 12px', borderRadius: '8px', width: '120px' }}>
                     <option value="50">50</option>
                     <option value="100">100</option>
                     <option value="200">200</option>
                     <option value="max">Max Allowed</option>
                   </select>
                </div>
             </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemSettings;
