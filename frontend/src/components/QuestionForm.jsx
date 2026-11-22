// Add or edit one multiple-choice question, with an optional image uploaded straight to S3.
import { useState } from 'react';
import { api, uploadToS3 } from '../services/api.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

// question is null when adding a new one.
export default function QuestionForm({ quizId, question, onSaved, onCancel }) {
  const [text, setText] = useState(question?.text ?? '');
  const [options, setOptions] = useState(question?.options ?? ['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(question?.correctOptionIndex ?? 0);
  const [marks, setMarks] = useState(question?.marks ?? 1);
  const [imageKey, setImageKey] = useState(question?.imageKey ?? null); // existing image, if any
  const [file, setFile] = useState(null); // new image picked in this form
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function setOption(index, value) {
    setOptions(options.map((option, i) => (i === index ? value : option)));
  }

  function removeOption(index) {
    setOptions(options.filter((_, i) => i !== index));
    // Keep the correct answer pointing at the same option after removing one.
    if (correctOptionIndex === index) setCorrectOptionIndex(0);
    else if (correctOptionIndex > index) setCorrectOptionIndex(correctOptionIndex - 1);
  }

  function pickFile(event) {
    const picked = event.target.files[0];
    setError('');
    if (!picked) return setFile(null);
    if (!IMAGE_TYPES.includes(picked.type)) {
      event.target.value = '';
      return setError('Image must be PNG, JPEG or WebP.');
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      event.target.value = '';
      return setError('Image must be 2 MB or smaller.');
    }
    setFile(picked);
  }

  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      let finalImageKey = imageKey;
      if (file) {
        // 1. Ask our API for a 5-minute upload link. 2. Upload the file directly to S3.
        const upload = await api.post(`/admin/quizzes/${quizId}/upload-url`, { contentType: file.type });
        await uploadToS3(upload.uploadUrl, file);
        finalImageKey = upload.imageKey;
      }
      const body = {
        text,
        options,
        correctOptionIndex,
        marks: Number(marks),
        imageKey: finalImageKey,
      };
      if (question) await api.put(`/admin/quizzes/${quizId}/questions/${question.questionId}`, body);
      else await api.post(`/admin/quizzes/${quizId}/questions`, body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="box" onSubmit={handleSave}>
      <h2>{question ? 'Edit question' : 'Add a question'}</h2>
      <label htmlFor="text">Question</label>
      <textarea id="text" rows={3} required maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />

      <label>Options (select the correct one)</label>
      {options.map((option, index) => (
        <div className="row" key={index} style={{ marginBottom: 6 }}>
          <input type="radio" name="correct" aria-label={`Option ${index + 1} is correct`}
            checked={correctOptionIndex === index} onChange={() => setCorrectOptionIndex(index)} />
          <input required maxLength={300} placeholder={`Option ${index + 1}`} style={{ flex: 1, width: 'auto' }}
            value={option} onChange={(e) => setOption(index, e.target.value)} />
          {options.length > 2 && (
            <button type="button" className="secondary" onClick={() => removeOption(index)}>Remove</button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <button type="button" className="secondary" onClick={() => setOptions([...options, ''])}>Add option</button>
      )}

      <label htmlFor="marks">Marks</label>
      <input id="marks" type="number" required min={1} max={10} value={marks} onChange={(e) => setMarks(e.target.value)} />

      <label htmlFor="image">Image (optional, PNG/JPEG/WebP, max 2 MB)</label>
      {imageKey && !file && (
        <p className="row">
          {question?.imageUrl && <img className="question-image" src={question.imageUrl} alt="Current" />}
          <button type="button" className="secondary" onClick={() => setImageKey(null)}>Remove image</button>
        </p>
      )}
      <input id="image" type="file" accept={IMAGE_TYPES.join(',')} onChange={pickFile} />

      {error && <p className="error">{error}</p>}
      <p className="row">
        <button disabled={busy}>{busy ? 'Saving…' : question ? 'Save changes' : 'Add question'}</button>
        {question && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
      </p>
    </form>
  );
}
