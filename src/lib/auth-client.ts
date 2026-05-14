import { createAuthClient } from "better-auth/svelte";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./server/auth";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
  plugins: [
    inferAdditionalFields<typeof auth>()
  ]
});

export const { signIn, signOut, useSession } = authClient;
