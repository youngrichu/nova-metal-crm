import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    const dest = locals.user.role === 'admin'
        ? '/dashboard/settings/system'
        : '/dashboard/settings/profile';
    throw redirect(302, dest);
};
