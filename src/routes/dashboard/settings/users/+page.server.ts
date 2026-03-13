import { db } from '$lib/server/db';
import { user as usersTable } from '$lib/server/db/schema/users';
import { eq, desc } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    // Admin-only route
    if ((locals.user as any).role !== 'admin') throw redirect(302, '/dashboard');

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
        if ((locals.user as any).role !== 'admin') return fail(403, { error: 'Admin only' });

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

    toggleVerified: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });
        if ((locals.user as any).role !== 'admin') return fail(403, { error: 'Admin only' });

        const formData = await request.formData();
        const targetId = formData.get('userId')?.toString();
        const currentValue = formData.get('emailVerified')?.toString() === 'true';

        if (!targetId) return fail(400, { error: 'Missing userId' });

        if (targetId === locals.user.id) {
            return fail(400, { error: 'You cannot deactivate your own account' });
        }

        try {
            await db.update(usersTable)
                .set({ emailVerified: !currentValue, updatedAt: new Date() })
                .where(eq(usersTable.id, targetId));

            return { success: true };
        } catch (e) {
            console.error(e);
            return fail(500, { error: 'Failed to update user status' });
        }
    }
};
