import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateRegistration } from '../auth/validation.js';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import { useForm } from '../hooks/useForm.js';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const location = useLocation();
  const { values, fieldErrors, formError, submitting, handleChange, handleSubmit } = useForm(
    { name: '', email: '', password: '' },
    validateRegistration,
    signUp,
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up access to your reconciliation workspace."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Sign in
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
          label="Name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={handleChange}
          error={fieldErrors.name}
        />
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
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short phrase works well.`}
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
        />
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
