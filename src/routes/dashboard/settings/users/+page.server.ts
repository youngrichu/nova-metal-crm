import { db } from '$lib/server/db';
import { user as usersTable, account as accountTable } from '$lib/server/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    // Admin-only route
    if (locals.user.role !== 'admin') throw redirect(302, '/dashboard');

    const allUsers = await db
        .select({
            id: usersTable.id,
            name: usersTable.name,
            email: usersTable.email,
            role: usersTable.role,
            emailVerified: usersTable.emailVerified,
            createdAt: usersTable.createdAt
        })
        .from(usersTable)
        .orderBy(desc(usersTable.createdAt));

    return { users: allUsers, currentUserId: locals.user.id };
};

export const actions: Actions = {
    updateRole: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if (locals.user.role !== 'admin') return fail(403, { error: 'Admin only' });

        const formData = await request.formData();
        const targetId = formData.get('userId')?.toString();
        const newRole = formData.get('role')?.toString();

        if (!targetId || !newRole) return fail(400, { error: 'Missing userId or role' });

        const validRoles = ['admin', 'sales', 'warehouse'];
        if (!validRoles.includes(newRole)) return fail(400, { error: 'Invalid role' });

        // Prevent self-demotion to avoid accidental lockout
        if (targetId === locals.user.id && newRole !== 'admin') {
            return fail(400, { error: 'You cannot change your own role' });
        }

        try {
            await db.update(usersTable)
                .set({ role: newRole, updatedAt: new Date() })
                .where(eq(usersTable.id, targetId));

            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update role' });
        }
    },

    createUser: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if (locals.user.role !== 'admin') return fail(403, { error: 'Admin only' });

        const formData = await request.formData();
        const name = formData.get('name')?.toString().trim();
        const email = formData.get('email')?.toString().trim().toLowerCase();
        const password = formData.get('password')?.toString();
        const role = formData.get('role')?.toString();

        if (!name || !email || !password || !role) {
            return fail(400, { error: 'All fields are required' });
        }

        const validRoles = ['admin', 'sales', 'warehouse'];
        if (!validRoles.includes(role)) return fail(400, { error: 'Invalid role' });

        if (password.length < 8) {
            return fail(400, { error: 'Password must be at least 8 characters' });
        }
        if (password.length > 128) {
            return fail(400, { error: 'Password must be 128 characters or fewer' });
        }

        // Check email uniqueness
        const existing = await db.select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);
        if (existing.length > 0) {
            return fail(400, { error: 'A user with this email already exists' });
        }

        try {
            const { hashPassword } = await import('better-auth/crypto');
            const hashedPassword = await hashPassword(password);
            const now = new Date();
            const userId = crypto.randomUUID();

            await db.transaction(async (tx) => {
                await tx.insert(usersTable).values({
                    id: userId,
                    name,
                    email,
                    emailVerified: true,
                    role,
                    createdAt: now,
                    updatedAt: now
                });

                await tx.insert(accountTable).values({
                    id: crypto.randomUUID(),
                    accountId: userId,
                    providerId: 'credential',
                    userId,
                    password: hashedPassword,
                    createdAt: now,
                    updatedAt: now
                });
            });

            return { success: true, created: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to create user' });
        }
    },

    toggleVerified: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if (locals.user.role !== 'admin') return fail(403, { error: 'Admin only' });

        const formData = await request.formData();
        const targetUserId = formData.get('userId')?.toString();

        if (!targetUserId) return fail(400, { error: 'Missing userId' });

        const currentUser = await db.select({ emailVerified: usersTable.emailVerified })
            .from(usersTable)
            .where(eq(usersTable.id, targetUserId))
            .limit(1);
        if (!currentUser[0]) return fail(404, { error: 'User not found' });
        const currentValue = currentUser[0].emailVerified;

        if (targetUserId === locals.user.id && currentValue) {
            return fail(400, { error: 'You cannot deactivate your own account' });
        }

        try {
            await db.update(usersTable)
                .set({ emailVerified: !currentValue, updatedAt: new Date() })
                .where(eq(usersTable.id, targetUserId));

            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update user status' });
        }
    }
};
