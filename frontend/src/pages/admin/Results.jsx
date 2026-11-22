// All results for one quiz: summary, table, CSV download, and the publish-results switch.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { attemptStatus, formatDate, percent } from '../../utils/format.js';

export default function QuizResults() {
  const { quizId } = useParams();
  const { data, error, reload } = useApi(`/admin/quizzes/${quizId}/results`);
  const [actionError, setActionError] = useState('');

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { quiz } = data;
  const results = [...data.results].sort((a, b) => String(a.rollNo ?? '').localeCompare(String(b.rollNo ?? '')));
  const scores = results.filter((r) => r.status === 'SUBMITTED').map((r) => r.score);
  const average = scores.length ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1) : '';

  async function setResultsPublished(value) {
    setActionError('');
    try {
      await api.patch(`/admin/quizzes/${quizId}`, { resultsPublished: value });
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <p><Link to={`/admin/quiz/${quizId}`}>← Back to quiz</Link></p>
      <h1>Results: {quiz.title}</h1>

      <div className="box">
        <div className="row space-between">
          <span>
            Submitted: <strong>{scores.length}</strong> · In progress: <strong>{results.length - scores.length}</strong>
            {scores.length > 0 && (
              <> · Average: <strong>{average} / {quiz.totalMarks}</strong> · Highest: <strong>{Math.max(...scores)}</strong>
                {' '}· Lowest: <strong>{Math.min(...scores)}</strong></>
            )}
          </span>
          <button className="secondary" onClick={() => downloadCsv(quiz, results)} disabled={results.length === 0}>
            Download CSV
          </button>
        </div>
        <p className="row">
          <strong>{quiz.resultsPublished ? 'Students can see their results.' : 'Results are hidden from students.'}</strong>
          <button onClick={() => setResultsPublished(!quiz.resultsPublished)}>
            {quiz.resultsPublished ? 'Hide results' : 'Publish results'}
          </button>
        </p>
        {actionError && <p className="error">{actionError}</p>}
      </div>

      {results.length === 0 ? (
        <p className="muted">No student has started this quiz yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Roll no.</th><th>Name</th><th>Email</th><th>Status</th><th>Score</th><th>%</th><th>Started</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.userId}>
                  <td>{r.rollNo}</td>
                  <td>{r.studentName}</td>
                  <td>{r.studentEmail}</td>
                  <td>{attemptStatus(r)}</td>
                  <td>{r.status === 'SUBMITTED' ? `${r.score} / ${r.totalMarks}` : ''}</td>
                  <td>{r.status === 'SUBMITTED' ? percent(r.score, r.totalMarks) : ''}</td>
                  <td>{formatDate(r.startedAt)}</td>
                  <td>{formatDate(r.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Builds the CSV in the browser and downloads it. No server needed.
function downloadCsv(quiz, results) {
  const header = ['Roll no', 'Name', 'Email', 'Status', 'Score', 'Total marks', 'Percent', 'Started', 'Submitted'];
  const rows = results.map((r) => [
    r.rollNo, r.studentName, r.studentEmail, attemptStatus(r),
    r.status === 'SUBMITTED' ? r.score : '', r.totalMarks, r.status === 'SUBMITTED' ? percent(r.score, r.totalMarks) : '',
    r.startedAt, r.submittedAt,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = `${quiz.title.replace(/[^a-z0-9]+/gi, '-')}-results.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000); // give the browser time to start the download
}

// Quotes a value for CSV. A leading =, +, - or @ is escaped so Excel never runs a name as a formula.
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
