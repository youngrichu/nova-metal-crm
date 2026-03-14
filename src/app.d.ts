import type { Session, User } from "better-auth";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: (User & { role: string }) | null;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
