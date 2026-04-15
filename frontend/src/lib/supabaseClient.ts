type SupabaseLike = {
  auth: {
    signInWithPassword: (payload: { email: string; password: string }) => Promise<{ data: { user: { id: string } | null } }>;
    signUp: (payload: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => Promise<{ data: { user: { id: string } | null } }>;
    signOut: () => Promise<void>;
  };
};

declare global {
  interface Window {
    __NUTRIFORGE_SUPABASE__?: SupabaseLike;
  }
}

export const supabase = typeof window !== "undefined" ? window.__NUTRIFORGE_SUPABASE__ ?? null : null;

