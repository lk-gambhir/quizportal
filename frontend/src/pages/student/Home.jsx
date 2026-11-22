// Student dashboard: quizzes open right now, and the student's own attempts.
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { attemptStatus, formatDate } from '../../utils/format.js';

export default function StudentHome() {
  const { data, error } = useApi('/quizzes');
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const attemptByQuiz = Object.fromEntries(data.attempts.map((attempt) => [attempt.quizId, attempt]));

  return (
    <>
      <h1>Available quizzes</h1>
      {data.quizzes.length === 0 && <p className="muted">No quizzes are open right now.</p>}
      {data.quizzes.map((quiz) => {
        const attempt = attemptByQuiz[quiz.quizId];
        return (
          <div className="box" key={quiz.quizId}>
            <div className="row space-between">
              <strong>{quiz.title}</strong>
              {!attempt && <Link className="button" to={`/student/quiz/${quiz.quizId}`}>Start</Link>}
              {attempt?.status === 'IN_PROGRESS' && <Link className="button" to={`/student/quiz/${quiz.quizId}`}>Resume</Link>}
              {attempt?.status === 'SUBMITTED' && <Link className="button secondary" to={`/student/result/${quiz.quizId}`}>View result</Link>}
            </div>
            {quiz.description && <p>{quiz.description}</p>}
            <p className="muted">
              {quiz.durationMinutes} minutes · {quiz.questionCount} questions · {quiz.totalMarks} marks · one attempt only
            </p>
          </div>
        );
      })}

      <h2>My attempts</h2>
      {data.attempts.length === 0 ? (
        <p className="muted">You have not attempted any quiz yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Quiz</th><th>Status</th><th>Score</th><th>Submitted</th><th></th></tr>
            </thead>
            <tbody>
              {data.attempts.map((attempt) => (
                <tr key={attempt.quizId}>
                  <td>{attempt.title}</td>
                  <td>{attemptStatus(attempt)}</td>
                  <td>
                    {attempt.status !== 'SUBMITTED' ? '' : attempt.resultsPublished
                      ? `${attempt.score} / ${attempt.totalMarks}` : 'Awaiting results'}
                  </td>
                  <td>{formatDate(attempt.submittedAt)}</td>
                  <td>
                    {attempt.status === 'SUBMITTED'
                      ? <Link to={`/student/result/${attempt.quizId}`}>View</Link>
                      : <Link to={`/student/quiz/${attempt.quizId}`}>Resume</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
