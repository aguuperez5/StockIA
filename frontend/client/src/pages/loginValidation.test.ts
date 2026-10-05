import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validatePassword,
  validateLoginForm,
} from "./loginValidation";

describe("HU-12: Login validation rules", () => {
  describe("validateEmail", () => {
    it("rejects empty or whitespace-only email", () => {
      expect(validateEmail("")).toBe("Ingresá tu correo electrónico.");
      expect(validateEmail("   ")).toBe("Ingresá tu correo electrónico.");
    });

    it("rejects invalid email formats", () => {
      expect(validateEmail("invalid-email")).toBe(
        "Ingresá un correo electrónico válido (ej. usuario@gmail.com)."
      );
      expect(validateEmail("usuario@")).toBe(
        "Ingresá un correo electrónico válido (ej. usuario@gmail.com)."
      );
      expect(validateEmail("usuario@com")).toBe(
        "Ingresá un correo electrónico válido (ej. usuario@gmail.com)."
      );
      expect(validateEmail("@dominio.com")).toBe(
        "Ingresá un correo electrónico válido (ej. usuario@gmail.com)."
      );
    });

    it("accepts valid email addresses", () => {
      expect(validateEmail("usuario@stockia.com")).toBeNull();
      expect(validateEmail("admin.caja@dominio.com.ar")).toBeNull();
      expect(validateEmail("  test@comercio.io  ")).toBeNull();
    });
  });

  describe("validatePassword", () => {
    it("rejects empty password", () => {
      expect(validatePassword("")).toBe("Ingresá tu contraseña.");
    });

    it("accepts non-empty password", () => {
      expect(validatePassword("secret123")).toBeNull();
    });
  });

  describe("validateLoginForm", () => {
    it("flags all errors when both fields are invalid", () => {
      const res = validateLoginForm({ email: "", password: "" });
      expect(res.isValid).toBe(false);
      expect(res.email).toBe("Ingresá tu correo electrónico.");
      expect(res.password).toBe("Ingresá tu contraseña.");
    });

    it("passes when all fields are valid", () => {
      const res = validateLoginForm({
        email: "caja@stockia.com",
        password: "securePassword123",
      });
      expect(res.isValid).toBe(true);
      expect(res.email).toBeUndefined();
      expect(res.password).toBeUndefined();
    });
  });
});
