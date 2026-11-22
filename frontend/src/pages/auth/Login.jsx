// Login for both students and faculty. Faculty created by script set a new password here on first login.
// Each screen is a <form>, so pressing Enter in any field submits it.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, setNewPassword } from '../../services/auth.js';
import PasswordInput from '../../components/PasswordInput.jsx';

export default function Login() {
  const navigate = useNavigate();
  const message = useLocation().state?.message; // e.g. "Account verified" from Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [session, setSession] = useState(null); // set when a new password is required
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function goToDashboard(user) {
    navigate(user.isAdmin ? '/admin' : '/student', { replace: true });
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email.trim(), password);
      if (result.newPasswordSession) setSession(result.newPasswordSession);
      else goToDashboard(result.user);
    } catch (err) {
      if (err.code === 'UserNotConfirmedException') {
        navigate('/register', { state: { confirmEmail: email.trim() } });
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleNewPassword(event) {
    event.preventDefault();
    if (newPassword !== confirmPassword) return setError('The two passwords do not match.');
    setError('');
    setBusy(true);
    try {
      goToDashboard((await setNewPassword(email.trim(), newPassword, session)).user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (session) {
    return (
      <main className="container narrow">
        <h1>Choose a new password</h1>
        <p className="muted">This is your first login. Please replace the temporary password.</p>
        <form onSubmit={handleNewPassword}>
          <label htmlFor="newPassword">New password</label>
          <PasswordInput id="newPassword" strong autoComplete="new-password"
            value={newPassword} onChange={(e) => setNewPasswordValue(e.target.value)} />
          <p className="muted">At least 8 characters with an uppercase letter, a lowercase letter and a number.</p>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <PasswordInput id="confirmPassword" autoComplete="new-password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <p><button type="submit" disabled={busy}>Save and log in</button></p>
        </form>
      </main>
    );
  }

  return (
    <main className="container narrow">
      <h1>Quiz Portal login</h1>
      {message && <p className="notice">{message}</p>}
      <form onSubmit={handleLogin}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <p><button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button></p>
      </form>
      <p><Link to="/forgot-password">Forgot password?</Link></p>
      <p>New student? <Link to="/register">Create an account</Link></p>
    </main>
  );
}
