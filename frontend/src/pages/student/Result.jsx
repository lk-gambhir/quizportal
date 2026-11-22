// A student's result for one quiz. Score and review appear only after faculty publish results.
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { attemptStatus, formatDate, percent } from '../../utils/format.js';

export default function StudentResult() {
  const { quizId } = useParams();
  const { data, error } = useApi(`/quizzes/${quizId}/result`);
  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;

  if (data.status === 'IN_PROGRESS') {
    return <p>This quiz is still in progress. <Link to={`/student/quiz/${quizId}`}>Resume it</Link>.</p>;
  }

  return (
    <>
      <h1>Your result</h1>
      <div className="box">
        <p>
          <strong>{attemptStatus(data)}</strong> on {formatDate(data.submittedAt)}
          {data.autoSubmitted && <span className="muted"> (time ran out, so your saved answers were submitted)</span>}
        </p>
        {data.resultsPublished ? (
          <p>
            Score: <strong>{data.score} / {data.totalMarks}</strong> ({percent(data.score, data.totalMarks)}) ·{' '}
            {data.correctCount} of {data.questionCount} correct
          </p>
        ) : (
          <p className="notice">Results will be available when your faculty publishes them.</p>
        )}
      </div>

      {data.resultsPublished && (
        <>
          <h2>Review</h2>
          {data.review.map((question, index) => (
            <div className="box" key={question.questionId}>
              <p>
                <strong>Q{index + 1}.</strong> {question.text}{' '}
                <span className="muted">({question.earned} / {question.marks})</span>
              </p>
              {question.imageUrl && <img className="question-image" src={question.imageUrl} alt={`Question ${index + 1}`} />}
              {question.options.map((option, optionIndex) => {
                const isCorrect = optionIndex === question.correctOptionIndex;
                const isYours = optionIndex === question.yourAnswer;
                return (
                  <div key={optionIndex} className={`option ${isCorrect ? 'correct' : isYours ? 'wrong' : ''}`}>
                    {option}
                    {isCorrect && <span className="badge">Correct answer</span>}
                    {isYours && <span className="badge">Your answer</span>}
                  </div>
                );
              })}
              {question.yourAnswer === null && <p className="muted">Not answered</p>}
            </div>
          ))}
        </>
      )}
      <p><Link to="/student">Back to my quizzes</Link></p>
    </>
  );
}
