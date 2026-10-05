export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Ingresá tu correo electrónico.";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Ingresá un correo electrónico válido (ej. usuario@gmail.com).";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Ingresá tu contraseña.";
  }
  return null;
}

export function validateLoginForm(form: {
  email: string;
  password: string;
}): {
  email?: string;
  password?: string;
  isValid: boolean;
} {
  const emailError = validateEmail(form.email);
  const passwordError = validatePassword(form.password);
  const result: { email?: string; password?: string; isValid: boolean } = {
    isValid: !emailError && !passwordError,
  };
  if (emailError) result.email = emailError;
  if (passwordError) result.password = passwordError;
  return result;
}
