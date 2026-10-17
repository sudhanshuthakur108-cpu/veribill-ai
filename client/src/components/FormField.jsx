import { useId } from 'react';

// Renders an <input> by default; pass as="select" (with <option> children) or
// as="textarea" for other controls.
export default function FormField({ label, error, hint, as: Control = 'input', children, ...controlProps }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Control id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...controlProps}>
        {children}
      </Control>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
