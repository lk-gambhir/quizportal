// One quiz for faculty: edit details, add/edit questions (while draft), publish/close, results switch, delete.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import QuestionForm from '../../components/QuestionForm.jsx';

export default function EditQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { data, error, reload } = useApi(`/admin/quizzes/${quizId}`);
  const [editing, setEditing] = useState(null); // question being edited, or null
  const [formKey, setFormKey] = useState(0); // changing it clears the "add question" form
  const [actionError, setActionError] = useState('');

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const { quiz, questions } = data;
  const isDraft = quiz.status === 'DRAFT';

  // Runs an API action after an optional confirmation, then reloads the quiz.
  async function act(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setActionError('');
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  const patch = (changes, confirmText) => act(() => api.patch(`/admin/quizzes/${quizId}`, changes), confirmText);

  async function deleteQuiz() {
    if (!window.confirm('Delete this draft quiz and all its questions?')) return;
    try {
      await api.delete(`/admin/quizzes/${quizId}`);
      navigate('/admin', { replace: true });
    } catch (err) {
      setActionError(err.message);
    }
  }

  function questionSaved() {
    setEditing(null);
    setFormKey(formKey + 1);
    reload();
  }

  return (
    <>
      <p><Link to="/admin">← All quizzes</Link></p>
      <h1>{quiz.title} <span className="badge">{quiz.status}</span></h1>

      <div className="box">
        <h2 style={{ marginTop: 0 }}>Actions</h2>
        <div className="row">
          {isDraft && (
            <button onClick={() => patch({ status: 'PUBLISHED' },
              'Publish this quiz? Students can start it, and questions can no longer be changed.')}>Publish quiz</button>
          )}
          {quiz.status === 'PUBLISHED' && (
            <button onClick={() => patch({ status: 'CLOSED' },
              'Close this quiz? No new students can start it. Students already taking it can finish.')}>Close quiz</button>
          )}
          {quiz.status === 'CLOSED' && <button onClick={() => patch({ status: 'PUBLISHED' })}>Reopen quiz</button>}

          {quiz.resultsPublished ? (
            <button className="secondary" onClick={() => patch({ resultsPublished: false })}>Hide results from students</button>
          ) : (
            <button className="secondary" onClick={() => patch({ resultsPublished: true }, quiz.status === 'PUBLISHED'
              ? 'The quiz is still open. Students who have finished will see the correct answers and could share them. Publish results anyway?'
              : 'Publish results? Students will see their scores and the correct answers.')}>
              Publish results to students
            </button>
          )}

          {!isDraft && <Link className="button secondary" to={`/admin/quiz/${quizId}/results`}>View results</Link>}
          {isDraft && <button className="secondary" onClick={deleteQuiz}>Delete quiz</button>}
        </div>
        <p className="muted">{quiz.resultsPublished ? 'Students can see their results.' : 'Results are hidden from students.'}</p>
        {actionError && <p className="error">{actionError}</p>}
      </div>

      <QuizDetails quiz={quiz} onSave={(changes) => patch(changes)} />

      <h2>Questions ({questions.length})</h2>
      {!isDraft && <p className="notice">This quiz is {quiz.status.toLowerCase()}, so its questions are locked.</p>}
      {questions.length === 0 && <p className="muted">No questions yet.</p>}
      {questions.map((question, index) => (
        <div className="box" key={question.questionId}>
          <div className="row space-between">
            <strong>Q{index + 1}. {question.text}</strong>
            <span className="muted">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span>
          </div>
          {question.imageUrl && <img className="question-image" src={question.imageUrl} alt={`Question ${index + 1}`} />}
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className={`option ${optionIndex === question.correctOptionIndex ? 'correct' : ''}`}>
              {option}
              {optionIndex === question.correctOptionIndex && <span className="badge">Correct</span>}
            </div>
          ))}
          {isDraft && (
            <p className="row">
              <button className="secondary" onClick={() => setEditing(question)}>Edit</button>
              <button className="secondary" onClick={() => act(
                () => api.delete(`/admin/quizzes/${quizId}/questions/${question.questionId}`), 'Delete this question?')}>
                Delete
              </button>
            </p>
          )}
        </div>
      ))}

      {isDraft && (
        <QuestionForm
          key={editing ? editing.questionId : `new-${formKey}`}
          quizId={quizId}
          question={editing}
          onSaved={questionSaved}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
  );
}

// Title, description and duration. Duration can only change while the quiz is a draft.
function QuizDetails({ quiz, onSave }) {
  const [form, setForm] = useState({ title: quiz.title, description: quiz.description, durationMinutes: quiz.durationMinutes });
  const isDraft = quiz.status === 'DRAFT';

  function handleSubmit(event) {
    event.preventDefault();
    const changes = { title: form.title, description: form.description };
    if (isDraft) changes.durationMinutes = Number(form.durationMinutes);
    onSave(changes);
  }

  return (
    <form className="box" onSubmit={handleSubmit}>
      <h2 style={{ marginTop: 0 }}>Details</h2>
      <label htmlFor="title">Title</label>
      <input id="title" required minLength={3} maxLength={120}
        value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <label htmlFor="description">Description</label>
      <textarea id="description" rows={2} maxLength={1000}
        value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <label htmlFor="duration">Duration (minutes)</label>
      <input id="duration" type="number" required min={1} max={180} disabled={!isDraft}
        value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
      {!isDraft && <p className="muted">Duration can only be changed while the quiz is a draft.</p>}
      <p><button className="secondary">Save details</button></p>
    </form>
  );
}
