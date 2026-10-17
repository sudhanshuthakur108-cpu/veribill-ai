import { useState } from 'react';

export function useAuthForm(initialValues, validate, submit) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(values);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // On success the auth state changes and the route guard navigates away.
      await submit(values);
    } catch (error) {
      setFieldErrors(error.fields ?? {});
      setFormError(error.message);
      setSubmitting(false);
    }
  }

  return { values, fieldErrors, formError, submitting, handleChange, handleSubmit };
}
