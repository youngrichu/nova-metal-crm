import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "$lib/server/auth";
import { building } from "$app/environment";
import { redirect } from "@sveltejs/kit";

export async function handle({ event, resolve }) {
    // Attempt to get the session from the current request
    const sessionCookie = event.cookies.get("better-auth.session_token");
    
    if (sessionCookie) {
        try {
            const { session, user } = await auth.api.getSession({
                headers: event.request.headers,
            }) ?? { session: null, user: null };
            event.locals.session = session;
            event.locals.user = user;
        } catch (e) {
            event.locals.session = null;
            event.locals.user = null;
        }
    } else {
        event.locals.session = null;
        event.locals.user = null;
    }

    const isLoginRoute = event.url.pathname.startsWith('/login');
    const isApiRoute = event.url.pathname.startsWith('/api/auth');

    // Protect all routes except login and auth API
    if (!event.locals.session && !isLoginRoute && !isApiRoute && !building) {
        throw redirect(302, '/login');
    }

    // Redirect logged-in users away from the login page
    if (event.locals.session && isLoginRoute && !building) {
        throw redirect(302, '/dashboard');
    }

    return svelteKitHandler({ event, resolve, auth, building });
}
