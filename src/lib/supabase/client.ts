import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

// Eén gedeelde instantie i.p.v. per aanroep — voorkomt de "Multiple
// GoTrueClient instances" waarschuwing en dubbele auth-listeners.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
