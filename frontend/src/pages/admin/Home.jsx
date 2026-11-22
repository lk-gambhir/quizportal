// Faculty dashboard: all quizzes, and a form to create a new one.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { formatDate } from '../../utils/format.js';

export default function AdminHome() {
  const navigate = useNavigate();
  const { data, error } = useApi('/admin/quizzes');
  const [form, setForm] = useState({ title: '', description: '', durationMinutes: 20 });
  const [createError, setCreateError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError('');
    setBusy(true);
    try {
      const quiz = await api.post('/admin/quizzes', { ...form, durationMinutes: Number(form.durationMinutes) });
      navigate(`/admin/quiz/${quiz.quizId}`); // straight to adding questions
    } catch (err) {
      setCreateError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Quizzes</h1>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p>Loading…</p>}
      {data?.quizzes.length === 0 && <p className="muted">No quizzes yet. Create one below.</p>}
      {data?.quizzes.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Status</th><th>Results</th><th>Questions</th><th>Marks</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {data.quizzes.map((quiz) => (
                <tr key={quiz.quizId}>
                  <td>{quiz.title}</td>
                  <td><span className="badge">{quiz.status}</span></td>
                  <td>{quiz.resultsPublished ? 'Published' : 'Hidden'}</td>
                  <td>{quiz.status === 'DRAFT' ? '' : quiz.questionCount}</td>
                  <td>{quiz.status === 'DRAFT' ? '' : quiz.totalMarks}</td>
                  <td>{formatDate(quiz.createdAt)}</td>
                  <td className="row">
                    <Link to={`/admin/quiz/${quiz.quizId}`}>Open</Link>
                    {quiz.status !== 'DRAFT' && <Link to={`/admin/quiz/${quiz.quizId}/results`}>Results</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Create a quiz</h2>
      <form className="box" onSubmit={handleCreate}>
        <label htmlFor="title">Title</label>
        <input id="title" required minLength={3} maxLength={120}
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label htmlFor="description">Description (optional)</label>
        <textarea id="description" rows={2} maxLength={1000}
          value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label htmlFor="duration">Duration (minutes)</label>
        <input id="duration" type="number" required min={1} max={180}
          value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
        {createError && <p className="error">{createError}</p>}
        <p><button disabled={busy}>Create and add questions</button></p>
      </form>
    </>
  );
}
