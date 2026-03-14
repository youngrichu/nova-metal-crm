import { db } from '$lib/server/db';
import { user as usersTable } from '$lib/server/db/schema/users';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');

    const [currentUser] = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, locals.user.id));

    return { user: currentUser };
};

export const actions: Actions = {
    updateName: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const name = formData.get('name')?.toString().trim();

        if (!name || name.length < 2) {
            return fail(400, { nameError: 'Name must be at least 2 characters' });
        }

        try {
            await db.update(usersTable)
                .set({ name, updatedAt: new Date() })
                .where(eq(usersTable.id, locals.user.id));

            return { nameSuccess: true };
        } catch (e) {
            console.error(e);
            return fail(500, { nameError: 'Failed to update name' });
        }
    },

    updatePassword: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const existingCredential = formData.get('currentPassword')?.toString();
        const updatedCredential = formData.get('newPassword')?.toString();
        const confirmCredential = formData.get('confirmPassword')?.toString();

        if (!existingCredential || !updatedCredential || !confirmCredential) {
            return fail(400, { pwError: 'All fields are required' });
        }

        if (updatedCredential.length < 8) {
            return fail(400, { pwError: 'New value must be at least 8 characters' });
        }

        if (updatedCredential !== confirmCredential) {
            return fail(400, { pwError: 'New value and confirmation do not match' });
        }

        try {
            const response = await auth.api.changePassword({
                headers: request.headers,
                body: {
                    currentPassword: existingCredential,
                    newPassword: updatedCredential,
                    revokeOtherSessions: true
                }
            });

            if (!response) {
                return fail(400, { pwError: 'Current credential is incorrect' });
            }

            return { pwSuccess: true };
        } catch (e: any) {
            console.error('Credential change error:', e);
            const message = e?.body?.message || e?.message || 'Failed to update credential';
            return fail(400, { pwError: message });
        }
    }
};
