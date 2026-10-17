import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.js';
import { validateLogin } from '../auth/validation.js';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { useForm } from '../hooks/useForm.js';

export default function LoginPage() {
  const { signIn } = useAuth();
  const location = useLocation();
  const { values, fieldErrors, formError, submitting, handleChange, handleSubmit } = useForm(
    { email: '', password: '' },
    validateLogin,
    signIn,
  );

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Reconcile supplier invoices against purchase orders."
      footer={
        <>
          New to VeriBill AI?{' '}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
