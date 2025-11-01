import { useAuth } from "../context/AuthContext";

export const useAuthHook = () => {
  const { user, login, logout } = useAuth();
  return { user, login, logout };
};
