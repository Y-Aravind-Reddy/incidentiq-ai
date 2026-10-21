import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Activity, CheckCircle2, Eye, EyeOff, Fingerprint, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabaseBrowser, supabaseBrowserConfigError } from '../config/supabaseBrowser.ts';

type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  mode: AuthMode;
}

function safeAuthError(message: string, mode: AuthMode): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'That email and password combination was not recognized.';
  if (normalized.includes('email not confirmed')) return 'Confirm your email address before signing in. Check your inbox for the verification message.';
  if (normalized.includes('already registered') || normalized.includes('user already exists')) return 'An account with this email already exists. Try signing in instead.';
  if (normalized.includes('password') && (normalized.includes('weak') || normalized.includes('least'))) return 'Choose a stronger password that meets your project’s password requirements.';
  if (normalized.includes('rate limit') || normalized.includes('too many')) return 'Too many attempts were made. Wait a little while, then try again.';
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('failed to connect')) return 'Could not reach Supabase Auth. Check your connection and public project URL.';
  if (normalized.includes('redirect') || normalized.includes('url') && normalized.includes('allow')) return 'Supabase rejected the return URL. Add this site’s /login URL to the Auth redirect allow list.';
  return mode === 'signup'
    ? 'Your account could not be created. Check the information and try again.'
    : 'We could not complete that request. Check your details and try again.';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const query = new URLSearchParams(window.location.search);
  const [isRecoveryRequest, setIsRecoveryRequest] = useState(false);
  const [isRecoveryUpdate, setIsRecoveryUpdate] = useState(mode === 'login' && query.get('flow') === 'recovery');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (mode !== 'login' || query.get('flow') === 'recovery' || !supabaseBrowser) return;
    let active = true;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (active && data.session) window.location.replace('/dashboard');
    });
    return () => { active = false; };
  }, [mode]);

  const clearFeedback = () => {
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!supabaseBrowser) {
      setError(supabaseBrowserConfigError || 'Supabase Auth is unavailable.');
      return;
    }
    if (!email.trim() && !isRecoveryUpdate) {
      setError('Enter your email address.');
      return;
    }
    if (!isRecoveryUpdate && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signup' && fullName.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if ((mode === 'signup' || isRecoveryUpdate) && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if ((mode === 'signup' || isRecoveryUpdate) && password !== confirmPassword) {
      setError('The password fields do not match.');
      return;
    }
    if (mode === 'login' && !isRecoveryRequest && !password) {
      setError('Enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login' && isRecoveryRequest) {
        const { error: requestError } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login?flow=recovery`,
        });
        if (requestError) throw requestError;
        setNotice('If an account exists for that address, Supabase will send a password recovery email.');
        return;
      }

      if (mode === 'login' && isRecoveryUpdate) {
        const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
        if (updateError) throw updateError;
        setNotice('Your password was updated. You can continue to the control room.');
        setPassword('');
        setConfirmPassword('');
        window.setTimeout(() => window.location.assign('/dashboard'), 900);
        return;
      }

      if (mode === 'login') {
        const { data, error: signInError } = await supabaseBrowser.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (!data.session) throw new Error('No active session was returned.');
        window.location.assign('/dashboard');
        return;
      }

      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        window.location.assign('/dashboard');
        return;
      }
      setNotice('Your account request was received. Check your email for a verification link before signing in.');
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : '';
      setError(safeAuthError(message, mode));
    } finally {
      setIsLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const heading = isRecoveryUpdate
    ? 'Choose a new password'
    : isRecoveryRequest
      ? 'Reset your password'
      : isSignup
        ? 'Create your account'
        : 'Welcome back';

  return (
    <main className="auth-page min-h-screen">
      <div className="auth-page-glow" aria-hidden="true" />
      <header className="auth-header">
        <a href="/" className="auth-brand" aria-label="IncidentIQ AI homepage">
          <span className="auth-brand-mark"><Activity aria-hidden="true" className="h-5 w-5" /></span>
          <span><strong>IncidentIQ <em>AI</em></strong><small>ENTERPRISE INCIDENT RESOLUTION</small></span>
        </a>
        <a className="auth-home-link" href="/">Back to home <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
      </header>

      <section className="auth-layout">
        <div className="auth-intro">
          <div className="auth-eyebrow"><span /> SRE INCIDENT RESPONSE</div>
          <h1>Clarity for the moments that matter.</h1>
          <p>Investigate incidents with traceable evidence, put human approval before action, and verify recovery in a controlled sandbox.</p>
          <div className="auth-principles">
            <div><Fingerprint /><span><strong>Evidence-led</strong><small>Investigations tied to retrieved sources</small></span></div>
            <div><LockKeyhole /><span><strong>Human-approved</strong><small>Operators authorize remediation plans</small></span></div>
            <div><ShieldCheck /><span><strong>Sandbox-controlled</strong><small>Actions stay within deterministic tools</small></span></div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-card-icon"><LockKeyhole aria-hidden="true" className="h-5 w-5" /></span>
            <div><h2>{heading}</h2><p>{isSignup ? 'Set up access to the IncidentIQ AI workspace.' : 'Sign in to continue to your incident workspace.'}</p></div>
          </div>

          {supabaseBrowserConfigError && (
            <div className="auth-message auth-error" role="alert">{supabaseBrowserConfigError}</div>
          )}
          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-message auth-success" role="status"><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />{notice}</div>}

          {notice.includes('verification link') ? (
            <div className="auth-confirmation"><Mail aria-hidden="true" /><p>Once verified, return here to sign in and open the control room.</p><a href="/login">Go to sign in <ArrowRight aria-hidden="true" className="h-4 w-4" /></a></div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {isSignup && <AuthInput label="Full name" type="text" value={fullName} onChange={setFullName} placeholder="Your name" autoComplete="name" icon={<Fingerprint />} disabled={isLoading} />}
              {!isRecoveryUpdate && <AuthInput label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@company.com" autoComplete="email" icon={<Mail />} disabled={isLoading} />}
              {(isSignup || (!isRecoveryRequest && !notice)) && <AuthInput label={isRecoveryUpdate ? 'New password' : 'Password'} type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword} placeholder={isSignup || isRecoveryUpdate ? 'At least 8 characters' : 'Enter your password'} autoComplete={isRecoveryUpdate ? 'new-password' : isSignup ? 'new-password' : 'current-password'} icon={<LockKeyhole />} disabled={isLoading} trailing={<button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button>} />}
              {(isSignup || isRecoveryUpdate) && <AuthInput label="Confirm password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your password" autoComplete="new-password" icon={<LockKeyhole />} disabled={isLoading} />}

              {!isSignup && !isRecoveryRequest && !isRecoveryUpdate && <button type="button" className="auth-forgot" onClick={() => { clearFeedback(); setIsRecoveryRequest(true); }}>Forgot password?</button>}

              <button className="auth-submit" type="submit" disabled={isLoading || Boolean(supabaseBrowserConfigError)}>
                {isLoading ? <span className="auth-spinner" aria-hidden="true" /> : null}
                {isLoading ? 'Please wait…' : isRecoveryRequest ? 'Send recovery email' : isRecoveryUpdate ? 'Update password' : isSignup ? 'Create account' : 'Sign in'}
                {!isLoading && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </button>
              {(isRecoveryRequest || isRecoveryUpdate) && <button type="button" className="auth-back-link" onClick={() => { clearFeedback(); setIsRecoveryRequest(false); setIsRecoveryUpdate(false); window.history.replaceState({}, '', '/login'); }}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to sign in</button>}
            </form>
          )}

          {!isRecoveryUpdate && !isRecoveryRequest && !notice.includes('verification link') && (
            <div className="auth-switch">
              {isSignup ? 'Already have an account?' : 'New to IncidentIQ AI?'}{' '}
              <a href={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</a>
            </div>
          )}
          <div className="auth-card-foot"><ShieldCheck aria-hidden="true" className="h-4 w-4" /> Secure sign-in powered by your Supabase project</div>
        </div>
      </section>
      <footer className="auth-footer"><span>IncidentIQ AI</span><span>Human oversight. Controlled response.</span></footer>
    </main>
  );
};

interface AuthInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

const AuthInput: React.FC<AuthInputProps> = ({ label, type, value, onChange, placeholder, autoComplete, icon, trailing, disabled }) => {
  const id = `auth-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        <input id={id} name={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} required disabled={disabled} minLength={type === 'password' ? 8 : undefined} />
        {trailing}
      </div>
    </div>
  );
};
