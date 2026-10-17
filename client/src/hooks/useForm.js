import { useRef, useState } from 'react';

export function useForm(initialValues, validate, submit) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Unlike state, a ref changes immediately, so a fast double click cannot send the
  // request twice before React re-renders the disabled button.
  const inFlight = useRef(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;

    const errors = validate(values);
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      // On success the page navigates away (or the route guard does), so the form
      // deliberately stays disabled.
      await submit(values);
    } catch (error) {
      setFieldErrors(error.fields ?? {});
      setFormError(error.message);
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  return { values, fieldErrors, formError, submitting, handleChange, handleSubmit };
}
