import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { BETTER_AUTH_URL, BETTER_AUTH_SECRET } from "$env/static/private";
import { db } from "../db";
import * as schema from "../db/schema";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
    emailAndPassword: {
        enabled: true,
        password: {
            hash: function(password) {
                return bcrypt.hash(password, 10);
            },
            verify: function(data) {
                return bcrypt.compare(data.password, data.hash);
            }
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
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