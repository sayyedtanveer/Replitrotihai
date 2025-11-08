import { usePhoneAuth } from "./usePhoneAuth";

// Deprecated: Use usePhoneAuth instead
// This hook is kept for backward compatibility
export function useAuth() {
  return usePhoneAuth();
}
