// Password field with an eye button to show or hide what is typed.
// strong = true adds the password rules (8+ characters, upper, lower, number) as native form validation.
import { useState } from 'react';

const STRONG_RULE = '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}';
const STRONG_HINT = 'At least 8 characters with an uppercase letter, a lowercase letter and a number';

export default function PasswordInput({ strong = false, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        required
        {...(strong ? { pattern: STRONG_RULE, title: STRONG_HINT } : {})}
      />
      {/* type="button" so pressing Enter in the field submits the form instead of toggling this */}
      <button type="button" className="eye" onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
