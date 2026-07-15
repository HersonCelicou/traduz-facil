import { supabase } from "@/integrations/supabase/client";

/** Returns Authorization header using the signed-in user's JWT.
 *  Throws if no session — callers must ensure the user is logged in. */
export async function authHeader(): Promise<{ Authorization: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return { Authorization: `Bearer ${token}` };
}
