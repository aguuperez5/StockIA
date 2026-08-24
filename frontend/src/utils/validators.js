// Validaciones de frontend reutilizables (SB-023)
// Cada validador recibe un valor y devuelve un mensaje de error (string) o null si es válido.

export const required = (msg = "Este campo es obligatorio") => (value) => {
  if (value === undefined || value === null) return msg;
  if (typeof value === "string" && value.trim() === "") return msg;
  return null;
};

export const email = (msg = "Ingresá un email válido") => (value) => {
  if (!value) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(value).trim()) ? null : msg;
};

export const minLength = (n, msg) => (value) => {
  if (!value) return null;
  return String(value).length >= n ? null : msg || `Debe tener al menos ${n} caracteres`;
};

export const isNumeric = (msg = "Ingresá un valor numérico") => (value) => {
  if (value === "" || value === undefined || value === null) return null;
  return !isNaN(Number(value)) ? null : msg;
};

export const numberGreaterThan = (min, msg) => (value) => {
  if (value === "" || value === undefined || value === null) return null;
  const n = Number(value);
  if (isNaN(n)) return msg || `Ingresá un número válido`;
  return n > min ? null : msg || `Debe ser mayor a ${min}`;
};

export const numberGreaterOrEqual = (min, msg) => (value) => {
  if (value === "" || value === undefined || value === null) return null;
  const n = Number(value);
  if (isNaN(n)) return msg || `Ingresá un número válido`;
  return n >= min ? null : msg || `Debe ser mayor o igual a ${min}`;
};

export const equalsField = (getOtherValue, msg = "Los valores no coinciden") => (value) => {
  return value === getOtherValue() ? null : msg;
};

export const phone = (msg = "Ingresá un teléfono válido") => (value) => {
  if (!value) return null;
  const re = /^[+\d][\d\s-]{6,}$/;
  return re.test(String(value).trim()) ? null : msg;
};

/**
 * Corre una lista de validadores sobre un valor y devuelve el primer error encontrado.
 */
export function runValidators(value, validatorList = []) {
  for (const validate of validatorList) {
    const err = validate(value);
    if (err) return err;
  }
  return null;
}

/**
 * Valida un objeto `values` contra un `schema` de la forma { campo: [validadores] }.
 * Devuelve { valid, errors }.
 */
export function validateForm(values, schema) {
  const errors = {};
  let valid = true;
  for (const field of Object.keys(schema)) {
    const err = runValidators(values[field], schema[field]);
    if (err) {
      errors[field] = err;
      valid = false;
    }
  }
  return { valid, errors };
}
