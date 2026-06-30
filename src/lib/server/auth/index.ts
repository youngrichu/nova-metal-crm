import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { BETTER_AUTH_URL } from "$env/static/private";
import { db } from "../db";
import * as schema from "../db/schema";

export const auth = betterAuth({
    baseURL: BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    emailAndPassword: {
        enabled: true
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: "sales",
            }
        }
    }
});
