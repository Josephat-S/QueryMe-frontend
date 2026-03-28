import React, { useState } from 'react';

// Enhanced mock data to support drill-down metrics per course
const courseData = [
  { courseId: 'C101', name: 'Database Systems 101', exams: 4, students: 45, avgScore: 78, metrics: { selectPass: 88, joinPass: 64, windowPass: 42, queriesGraded: 4203, passRate: 74, avgTime: 12, timeoutRate: 15 } },
  { courseId: 'C201', name: 'Data Management', exams: 2, students: 30, avgScore: 82, metrics: { selectPass: 92, joinPass: 75, windowPass: 50, queriesGraded: 1250, passRate: 82, avgTime: 14, timeoutRate: 6 } },
  { courseId: 'C301', name: 'Advanced SQL Masters', exams: 6, students: 15, avgScore: 91, metrics: { selectPass: 98, joinPass: 89, windowPass: 85, queriesGraded: 2450, passRate: 91, avgTime: 18, timeoutRate: 4 } },
];

const Reports: React.FC = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');

  // Compute aggregate statistics if "ALL" is selected, otherwise get specific course metrics
  const activeMetrics = React.useMemo(() => {
    if (selectedCourseId === 'ALL') {
       return {
         selectPass: Math.round(courseData.reduce((acc, c) => acc + c.metrics.selectPass, 0) / courseData.length),
         joinPass: Math.round(courseData.reduce((acc, c) => acc + c.metrics.joinPass, 0) / courseData.length),
         windowPass: Math.round(courseData.reduce((acc, c) => acc + c.metrics.windowPass, 0) / courseData.length),
         queriesGraded: courseData.reduce((acc, c) => acc + c.metrics.queriesGraded, 0),
         passRate: Math.round(courseData.reduce((acc, c) => acc + c.metrics.passRate, 0) / courseData.length),
         avgTime: Math.round(courseData.reduce((acc, c) => acc + c.metrics.avgTime, 0) / courseData.length),
         timeoutRate: Math.round(courseData.reduce((acc, c) => acc + c.metrics.timeoutRate, 0) / courseData.length),
       };
    }
    return courseData.find(c => c.courseId === selectedCourseId)!.metrics;
  }, [selectedCourseId]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Platform Reports</h1>
          <p>Aggregate performance metrics across all courses and exams</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCourseId('ALL')} style={{ opacity: selectedCourseId === 'ALL' ? 0.5 : 1, pointerEvents: selectedCourseId === 'ALL' ? 'none' : 'auto' }}>
          Reset Global View
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '22px' }}>
        
        {/* Course Performance Summary */}
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="content-card-header">
            <h2>📈 Course Performance Overview</h2>
          </div>
          <div className="content-card-body" style={{ padding: 0, overflowX: 'auto' }}>
             <table className="data-table">
               <thead>
                 <tr>
                   <th>Course Name</th>
                   <th>Exams Conducted</th>
                   <th>Enrolled Students</th>
                   <th>Avg. Participant Score</th>
                   <th>Action</th>
                 </tr>
               </thead>
               <tbody>
                  {courseData.map((r) => (
                    <tr key={r.courseId} style={{ background: selectedCourseId === r.courseId ? 'var(--accent-bg)' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>{r.exams}</td>
                      <td>{r.students}</td>
                      <td><span className="badge badge-green" style={{ fontSize: '13px' }}>{r.avgScore}%</span></td>
                      <td>
                         <button 
                            className="btn btn-sm" 
                            style={{ 
                              background: selectedCourseId === r.courseId ? '#6a3cb0' : 'rgba(106, 60, 176, 0.1)', 
                              color: selectedCourseId === r.courseId ? '#fff' : '#6a3cb0', 
                              border: 'none', 
                              padding: '4px 12px' 
                            }}
                            onClick={() => setSelectedCourseId(r.courseId)}
                          >
                           {selectedCourseId === r.courseId ? 'Viewing...' : 'Inspect Data'}
                         </button>
                      </td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>

        {/* Success Rates */}
        <div className="content-card">
           <div className="content-card-header">
             <h2>🎯 Query Success Rates {selectedCourseId !== 'ALL' && '(Filtered)'}</h2>
           </div>
           <div className="content-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                       <span>SELECT statements</span>
                       <span style={{ fontWeight: 600 }}>{activeMetrics.selectPass}% Pass</span>
                    </div>
                    <div className="progress-bg">
                       <div style={{ width: `${activeMetrics.selectPass}%`, height: '100%', background: '#38a169', borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                    </div>
                 </div>
                 <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                       <span>JOIN operations</span>
                       <span style={{ fontWeight: 600 }}>{activeMetrics.joinPass}% Pass</span>
                    </div>
                    <div className="progress-bg">
                       <div style={{ width: `${activeMetrics.joinPass}%`, height: '100%', background: '#dd6b20', borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                    </div>
                 </div>
                 <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                       <span>Window Functions</span>
                       <span style={{ fontWeight: 600 }}>{activeMetrics.windowPass}% Pass</span>
                    </div>
                    <div className="progress-bg">
                       <div style={{ width: `${activeMetrics.windowPass}%`, height: '100%', background: '#e53e3e', borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Global Statistics */}
        <div className="content-card">
           <div className="content-card-header">
             <h2>📊 Key Indicators {selectedCourseId !== 'ALL' && '(Filtered)'}</h2>
           </div>
           <div className="content-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className="metric-box">
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#6a3cb0', marginBottom: '4px' }}>
                       {activeMetrics.queriesGraded.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>Queries Graded</div>
                 </div>
                 <div className="metric-box">
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#38a169', marginBottom: '4px' }}>
                       {activeMetrics.passRate}%
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>Submission Pass Rate</div>
                 </div>
                 <div className="metric-box">
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#dd6b20', marginBottom: '4px' }}>
                       {activeMetrics.avgTime}m
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>Avg Time per Question</div>
                 </div>
                 <div className="metric-box">
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#e53e3e', marginBottom: '4px' }}>
                       {activeMetrics.timeoutRate}%
                    </div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.7 }}>Timeout Error Rate</div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
