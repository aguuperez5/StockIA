import { api, get, post } from "./http";
export type AppRole = "administrador" | "caja" | "deposito";
export type StockUser = {
  id: number;
  fullName: string;
  legajo: string;
  email: string;
  appRole: AppRole;
};
export type AuthResponse = { user: StockUser; message: string };
export const authService = {
  me: () => get<{ user: StockUser }>("/auth/me"),
  login: (input: { email: string; password: string }) =>
    post<AuthResponse>("/auth/login", input),
  register: (input: {
    fullName: string;
    legajo: string;
    email: string;
    password: string;
  }) => post<AuthResponse>("/users/register", input),
  logout: () => api<{ message: string }>("/auth/logout", { method: "POST" }),
};
