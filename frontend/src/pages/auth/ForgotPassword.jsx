// Password reset in two steps: request a code, then enter it with a new password.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../../services/auth.js';
import PasswordInput from '../../components/PasswordInput.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSendCode(event) {
    event.preventDefault();
    run(async () => {
      await forgotPassword(email.trim());
      setCodeSent(true);
    });
  }

  function handleReset(event) {
    event.preventDefault();
    if (password !== confirmPassword) return setError('The two passwords do not match.');
    run(async () => {
      await resetPassword(email.trim(), code.trim(), password);
      navigate('/login', { replace: true, state: { message: 'Password changed. You can log in now.' } });
    });
  }

  return (
    <main className="container narrow">
      <h1>Reset password</h1>
      {!codeSent ? (
        <form onSubmit={handleSendCode}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <p><button type="submit" disabled={busy}>Send reset code</button></p>
        </form>
      ) : (
        <form onSubmit={handleReset}>
          <p className="notice">If an account exists for {email}, we emailed it a code.</p>
          <label htmlFor="code">Code</label>
          <input id="code" required inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          <label htmlFor="password">New password</label>
          <PasswordInput id="password" strong autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="muted">At least 8 characters with an uppercase letter, a lowercase letter and a number.</p>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <PasswordInput id="confirmPassword" autoComplete="new-password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <p><button type="submit" disabled={busy}>Change password</button></p>
        </form>
      )}
      <p><Link to="/login">Back to login</Link></p>
    </main>
  );
}
