import { FormEvent, InputHTMLAttributes, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Recycle } from 'lucide-react';
import { signIn, homeFor } from '../../../store';
import { authenticate } from '../../../services/auth';
import { Field } from '../../common/UI';

type AuthProps = { register?: boolean; driver?: boolean };
type CredentialProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
  fresh: boolean;
};

function CredentialInput({ value, onValueChange, fresh, ...props }: CredentialProps) {
  const [editing, setEditing] = useState(false);
  // Password managers can ignore autocomplete="off". Keep a fresh sign-in field
  // read-only until pointer or keyboard focus, without blocking typing or paste.
  const locked = fresh && !editing;
  return <input {...props} value={value} readOnly={locked}
    onFocus={event => {
      if (locked) {
        event.currentTarget.value = value;
        setEditing(true);
      }
    }}
    onChange={event => {
      if (locked) event.currentTarget.value = value;
      else onValueChange(event.currentTarget.value);
    }}
  />;
}

export default function Auth(props: AuthProps) {
  const location = useLocation();
  const [restoration, setRestoration] = useState(0);
  useEffect(() => {
    // Browser back/forward cache can restore DOM values without remounting React.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setRestoration(value => value + 1);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
  return <AuthForm key={`${location.key}:${restoration}:${!!props.register}:${!!props.driver}`} {...props} />;
}

function AuthForm({ register = false, driver = false }: AuthProps) {
  const dispatch = useDispatch(), nav = useNavigate(), cache = useQueryClient();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [name, setName] = useState(''), [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);

  async function go(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (register && password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const session = await authenticate(email, password, register ? { name } : undefined, driver);
      setEmail(''); setPassword(''); setName(''); setConfirm('');
      cache.clear();
      dispatch(signIn(session));
      nav(homeFor(session.role), { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign in failed');
      setPassword(''); setConfirm('');
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth">
    <section className="auth-art">
      <div className="brand light"><span><Recycle /></span><b>earth<i>forward</i></b></div>
      <div>
        <span className="eyebrow">{driver ? 'COLLECTION TEAM' : 'WASTE LESS · LIVE MORE'}</span>
        <h1>{driver ? 'Your route.\nA cleaner city.' : 'Small actions. A cleaner tomorrow.'}</h1>
        <p>{driver ? 'Sign in to view your assigned truck, collection points and route.' : 'Book collections, find public bins and manage your saved addresses.'}</p>
      </div>
    </section>
    <section className="auth-form">
      <form onSubmit={go} autoComplete="off">
        <h1>{register ? 'Create your account' : driver ? 'Driver sign in' : 'Welcome back'}</h1>
        <p>{register ? 'Register with your name, email and password. Add optional profile details later.' : driver ? 'Use the driver account created by your administrator.' : 'Resident and administrator sign in.'}</p>
        {register && <Field label="Full name"><input name="name" required minLength={2} value={name} onChange={event => setName(event.target.value)} /></Field>}
        <Field label="Email">
          <CredentialInput name="signin-email" type="email" required autoComplete="off" autoCapitalize="none" spellCheck={false}
            fresh={!register} value={email} onValueChange={setEmail} />
        </Field>
        <Field label="Password">
          <CredentialInput name="signin-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password"
            fresh={!register} value={password} onValueChange={setPassword} />
        </Field>
        {register && <Field label="Confirm password"><input name="confirm" type="password" required value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" /></Field>}
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="button wide" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        {!driver && <p className="center"><Link to={register ? '/auth/login' : '/auth/register'}>{register ? 'Already registered? Sign in' : 'New resident? Create account'}</Link></p>}
        <p className="center"><Link to={driver ? '/auth/login' : '/auth/driver'}>{driver ? 'Resident / admin sign in' : 'Truck driver sign in'}</Link></p>
      </form>
    </section>
  </div>;
}
