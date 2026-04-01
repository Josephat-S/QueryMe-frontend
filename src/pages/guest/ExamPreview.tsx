import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockExams } from './mockData';

const ExamPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const exam = mockExams.find((e) => e.id === Number(id));

  if (!exam) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exam not found</h2>
        <Link to="/guest/browse" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Exams
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <div className="mb-6">
          <Link to="/guest/browse" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Exams List
          </Link>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{exam.title}</h1>
        <p className="text-lg text-gray-600 mb-6">{exam.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500 bg-gray-100/50 p-4 rounded-lg">
          <span className="flex items-center">
            <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Duration: {exam.duration} minutes
          </span>
          <span className="flex items-center">
            <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {exam.questions.length} Questions
          </span>
        </div>
      </div>

      <div className="space-y-12">
        {exam.questions.map((q, index) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                  Question {index + 1}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Multiple Choice / Query
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-6 font-sans leading-relaxed">
                {q.prompt}
              </h3>
              
              {/* Visual-only (disabled) SQL Editor Mockup */}
              <div className="group relative mb-8">
                <div className="absolute inset-0 bg-gray-200/20 rounded-xl pointer-events-none z-10"></div>
                <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm shadow-inner min-h-[140px] opacity-75 ring-1 ring-gray-700">
                  <div className="flex space-x-2 mb-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500/50"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                  <pre className="text-gray-400 select-none">
                    <span className="text-pink-500 italic font-medium">-- Write your query here</span>
                    <br />
                    SELECT * FROM table_name;
                  </pre>
                </div>
                <div className="absolute top-4 right-4 flex items-center text-xs text-gray-500 font-medium bg-gray-800/80 px-2 py-1 rounded-md border border-gray-700">
                  <svg className="mr-1.5 h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Editor Disabled
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic">
                   Unlock interaction with a full account.
                </p>
                <button
                  disabled
                  className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed transition-all opacity-80"
                  title="Interaction disabled in guest mode"
                >
                  <svg className="mr-2 h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Submit Answer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 text-center border-t border-gray-100 pt-12">
         <p className="text-gray-500 mb-6">Want to submit answers and get a score?</p>
         <div className="flex items-center justify-center space-x-6">
            <Link to="/guest" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
               Return Home
            </Link>
            <Link to="/guest/browse" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
               Browse more exams
            </Link>
         </div>
      </div>
    </div>
  );
};

export default ExamPreview;
