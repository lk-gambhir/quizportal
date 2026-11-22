// Student registration in two steps: the form, then the code Cognito emails.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmRegistration, register, resendCode } from '../../services/auth.js';
import PasswordInput from '../../components/PasswordInput.jsx';

export default function Register() {
  const navigate = useNavigate();
  // Login sends unverified users here with their email, straight to the code step.
  const confirmEmail = useLocation().state?.confirmEmail;
  const [form, setForm] = useState({ name: '', rollNo: '', email: confirmEmail ?? '', password: '' });
  const [step, setStep] = useState(confirmEmail ? 'code' : 'form');
  const [code, setCode] = useState('');
  const [info, setInfo] = useState(confirmEmail ? 'Please verify your email first. Enter the code we sent you.' : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Runs an action with the busy flag and error message handled.
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

  function handleRegister(event) {
    event.preventDefault();
    run(async () => {
      await register({ ...form, name: form.name.trim(), rollNo: form.rollNo.trim(), email: form.email.trim() });
      setInfo(`We emailed a verification code to ${form.email}.`);
      setStep('code');
    });
  }

  function handleConfirm(event) {
    event.preventDefault();
    run(async () => {
      await confirmRegistration(form.email.trim(), code.trim());
      navigate('/login', { replace: true, state: { message: 'Your account is verified. You can log in now.' } });
    });
  }

  function handleResend() {
    run(async () => {
      await resendCode(form.email.trim());
      setInfo('A new code has been sent.');
    });
  }

  if (step === 'code') {
    return (
      <main className="container narrow">
        <h1>Verify your email</h1>
        {info && <p className="notice">{info}</p>}
        <form onSubmit={handleConfirm}>
          <label htmlFor="code">Verification code</label>
          <input id="code" required inputMode="numeric" autoComplete="one-time-code"
            value={code} onChange={(e) => setCode(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <p className="row">
            <button type="submit" disabled={busy}>Verify</button>
            <button type="button" className="secondary" onClick={handleResend} disabled={busy}>Resend code</button>
          </p>
        </form>
        <p><Link to="/login">Back to login</Link></p>
      </main>
    );
  }

  return (
    <main className="container narrow">
      <h1>Create a student account</h1>
      <form onSubmit={handleRegister}>
        <label htmlFor="name">Full name</label>
        <input id="name" required maxLength={100} value={form.name} onChange={update('name')} />
        <label htmlFor="rollNo">Roll number</label>
        <input id="rollNo" required maxLength={20} value={form.rollNo} onChange={update('rollNo')} />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="username" value={form.email} onChange={update('email')} />
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" strong autoComplete="new-password"
          value={form.password} onChange={update('password')} />
        <p className="muted">At least 8 characters with an uppercase letter, a lowercase letter and a number.</p>
        {error && <p className="error">{error}</p>}
        <p><button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button></p>
      </form>
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </main>
  );
}
