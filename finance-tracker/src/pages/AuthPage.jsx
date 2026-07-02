import { useEffect, useState } from 'react';
import heroArt from '../assets/hero.png';
import { useAuth } from '../store/AuthContext.jsx';
import { useSettings } from '../store/SettingsContext.jsx';
import { Field } from '../components/ui.jsx';
import { IconSun, IconMoon } from '../components/icons.jsx';

export default function AuthPage() {
  const { login, register, requestResetOtp, verifyResetOtp, resetPassword } = useAuth();
  const { resolvedTheme, toggleTheme } = useSettings();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', otp: '' });
  const [resetStep, setResetStep] = useState('email');
  const [resetToken, setResetToken] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'reset') {
        if (resetStep === 'email') {
          await requestResetOtp({ email: form.email });
          setResetStep('otp');
          setResendIn(60);
          setNotice(`Verification code sent to ${form.email}. Check Spam or Promotions if it is not in Inbox.`);
        } else if (resetStep === 'otp') {
          const result = await verifyResetOtp({ email: form.email, otp: form.otp });
          setResetToken(result.resetToken);
          setResetStep('password');
          setNotice('Email verified. Create your new password.');
        } else {
          if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
          if (form.password !== form.confirm) throw new Error('Passwords do not match.');
          await resetPassword({ email: form.email, newPassword: form.password, resetToken });
          setMode('login');
          setResetStep('email');
          setResetToken('');
          setForm((current) => ({ ...current, password: '', confirm: '', otp: '' }));
          setNotice('Password updated. You can sign in now.');
        }
      } else if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else if (mode === 'register') {
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (form.password !== form.confirm) throw new Error('Passwords do not match.');
        await register({ name: form.name, email: form.email, password: form.password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const baseTitles = {
    login: 'Welcome back',
    register: 'Create your RupeeFlow',
    reset: 'Reset password',
  };
  const titles = mode === 'reset' && resetStep === 'otp'
    ? 'Check your email'
    : mode === 'reset' && resetStep === 'password'
      ? 'Choose new password'
      : baseTitles[mode];
  const cta = mode === 'reset'
    ? { email: 'Send verification code', otp: 'Verify code', password: 'Update password' }[resetStep]
    : { login: 'Sign in', register: 'Create account' }[mode];

  function switchMode(nextMode) {
    setMode(nextMode);
    setResetStep('email');
    setResetToken('');
    setResendIn(0);
    setForm((current) => ({ ...current, password: '', confirm: '', otp: '' }));
    setError('');
    setNotice('');
  }

  async function resendOtp() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await requestResetOtp({ email: form.email });
      setResendIn(60);
      setNotice('A new verification code was sent. Check Spam or Promotions if needed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">₹</span>
          <span>RupeeFlow</span>
        </div>

        <div className="auth-brand-copy">
          <p className="auth-eyebrow">Personal finance, made for India</p>
          <h1 className="num">Every rupee<br />has a purpose.</h1>
          <p>UPI spends, EMIs, bills, budgets, and savings in one calm workspace.</p>
        </div>

        <div className="auth-privacy-note">
          <span className="auth-privacy-dot" aria-hidden="true" />
          Data stays on this device
        </div>
        <img className="auth-brand-art" src={heroArt} alt="" aria-hidden="true" />
      </aside>

      <main className="auth-form-area">
        <button className="btn ghost auth-theme-button" aria-label="Toggle dark mode" title="Toggle theme" onClick={toggleTheme}>
          {resolvedTheme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>

        <section className="auth-form-panel">
          <div className="auth-mobile-brand">
            <span className="auth-brand-mark" aria-hidden="true">₹</span>
            <span>RupeeFlow</span>
          </div>

          {mode !== 'reset' && (
            <div className="auth-mode-tabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Create account</button>
            </div>
          )}

          <div className="auth-heading">
            <h2>{titles}</h2>
            <p className="muted">
              {mode === 'login' && 'Sign in to pick up where you left off.'}
              {mode === 'register' && 'Set up an account to start tracking.'}
              {mode === 'reset' && resetStep === 'email' && 'Enter your registered email to receive a verification code.'}
              {mode === 'reset' && resetStep === 'otp' && `Enter the 6-digit code sent to ${form.email}.`}
              {mode === 'reset' && resetStep === 'password' && 'Email verified. Set a secure new password.'}
            </p>
          </div>

          {notice && <Banner tone="green">{notice}</Banner>}
          {error && <Banner tone="clay">{error}</Banner>}

          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && (
              <Field label="Name">
                <input className="input" value={form.name} onChange={set('name')} required placeholder="Alex Morgan" />
              </Field>
            )}
            {(mode !== 'reset' || resetStep === 'email') && (
              <Field label="Email">
                <input className="input" type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" autoComplete="email" />
              </Field>
            )}
            {mode === 'reset' && resetStep === 'otp' && (
              <Field label="Verification code">
                <input className="input auth-otp-input" value={form.otp} onChange={set('otp')} required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" />
              </Field>
            )}
            {(mode !== 'reset' || resetStep === 'password') && (
              <Field label={mode === 'reset' ? 'New password' : 'Password'}>
                <input className="input" type="password" value={form.password} onChange={set('password')} required placeholder="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </Field>
            )}
            {(mode === 'register' || (mode === 'reset' && resetStep === 'password')) && (
              <Field label="Confirm password">
                <input className="input" type="password" value={form.confirm} onChange={set('confirm')} required placeholder="Confirm password" autoComplete="new-password" />
              </Field>
            )}

            <button className="btn primary auth-submit" type="submit" disabled={busy}>
              {busy ? 'Please wait...' : cta}
            </button>
          </form>

          {mode === 'reset' && resetStep === 'otp' && (
            <div className="auth-resend">
              <span>Code expires in 10 minutes.</span>
              <button className="linklike" type="button" onClick={resendOtp} disabled={busy || resendIn > 0}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
          )}

          <div className="auth-links">
            {mode === 'login' && <button className="linklike" onClick={() => switchMode('reset')}>Forgot your password?</button>}
            {mode !== 'login' && <button className="linklike" onClick={() => switchMode('login')}>Back to sign in</button>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Banner({ tone, children }) {
  const bg = tone === 'green' ? 'var(--evergreen-bg)' : 'var(--clay-bg)';
  const fg = tone === 'green' ? 'var(--evergreen-d)' : 'var(--clay)';
  return <div style={{ background: bg, color: fg, padding: '10px 14px', borderRadius: 'var(--radius-s)', fontSize: 14, marginBottom: 16 }}>{children}</div>;
}
