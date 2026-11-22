// Taking a quiz: questions, countdown, save on every click, submit (or auto-submit at 0:00).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { formatSeconds } from '../../utils/format.js';

export default function TakeQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [endsAt, setEndsAt] = useState(null); // deadline in this computer's clock
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  // Refs hold values the timer needs without restarting it on every click.
  const answersRef = useRef({});
  const submittingRef = useRef(false);

  const showResult = useCallback(() => navigate(`/student/result/${quizId}`, { replace: true }), [navigate, quizId]);

  // Start (or resume) the attempt when the page opens.
  useEffect(() => {
    async function start() {
      try {
        const data = await api.post(`/quizzes/${quizId}/start`);
        // Correct for a wrong local clock: the server's deadline minus the clock difference.
        const clockOffset = Date.parse(data.serverTime) - Date.now();
        answersRef.current = data.answers ?? {};
        setAnswers(answersRef.current);
        setQuiz(data);
        setEndsAt(Date.parse(data.deadline) - clockOffset);
      } catch (err) {
        if (err.code === 'ALREADY_SUBMITTED') showResult();
        else setError(err.message);
      }
    }
    start();
  }, [quizId, showResult]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await api.post(`/quizzes/${quizId}/submit`, { answers: answersRef.current });
      showResult();
    } catch (err) {
      if (err.code === 'ALREADY_SUBMITTED') return showResult();
      submittingRef.current = false; // allow a retry (the timer retries every second at 0:00)
      setError(`Could not submit: ${err.message}. Your saved answers are safe.`);
    }
  }, [quizId, showResult]);

  // Countdown. At 0:00, submit automatically with whatever has been answered.
  useEffect(() => {
    if (!endsAt) return;
    function tick() {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) submit();
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt, submit]);

  // Save each answer to the server as soon as it is chosen.
  async function choose(questionId, optionIndex) {
    answersRef.current = { ...answersRef.current, [questionId]: optionIndex };
    setAnswers(answersRef.current);
    try {
      await api.put(`/quizzes/${quizId}/answers`, { questionId, optionIndex });
      setSaveError('');
    } catch (err) {
      // Not fatal: Submit sends all answers again.
      setSaveError(`Your last answer was not saved (${err.message}). It will be sent again when you submit.`);
    }
  }

  function handleSubmitClick() {
    const unanswered = quiz.questions.length - Object.keys(answers).length;
    const warning = unanswered > 0 ? `You have ${unanswered} unanswered question(s). ` : '';
    if (window.confirm(`${warning}Submit now? You cannot change your answers after this.`)) submit();
  }

  if (error && !quiz) return <p className="error">{error}</p>;
  if (!quiz) return <p>Loading…</p>;

  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <h1>{quiz.quiz.title}</h1>
      <div className={`timer row space-between ${secondsLeft !== null && secondsLeft < 60 ? 'low' : ''}`}>
        <span>Time left: {secondsLeft === null ? '' : formatSeconds(secondsLeft)}</span>
        <span className="muted">Answered {answeredCount} of {quiz.questions.length}</span>
      </div>
      {saveError && <p className="error">{saveError}</p>}
      {error && <p className="error">{error}</p>}

      {quiz.questions.map((question, index) => (
        <div className="box" key={question.questionId}>
          <p>
            <strong>Q{index + 1}.</strong> {question.text}{' '}
            <span className="muted">({question.marks} {question.marks === 1 ? 'mark' : 'marks'})</span>
          </p>
          {question.imageUrl && <img className="question-image" src={question.imageUrl} alt={`Question ${index + 1}`} />}
          {question.options.map((option, optionIndex) => (
            <label key={optionIndex} className={`option ${answers[question.questionId] === optionIndex ? 'selected' : ''}`}>
              <input
                type="radio"
                name={question.questionId}
                checked={answers[question.questionId] === optionIndex}
                onChange={() => choose(question.questionId, optionIndex)}
              />
              {option}
            </label>
          ))}
        </div>
      ))}

      <p><button onClick={handleSubmitClick}>Submit quiz</button></p>
    </>
  );
}
