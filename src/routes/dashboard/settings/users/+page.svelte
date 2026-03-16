<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { enhance } from '$app/forms';
	import { Users, ChevronDown, Shield, CheckCircle, XCircle, Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { DataCards } from '$lib/components/ui/data-cards';
	import { PageFAB } from '$lib/components/ui/fab';
	import { invalidateAll } from '$app/navigation';
	import type { ActionsInput } from '$lib/components/ui/data-cards';

	let { data, form } = $props();

	let createDialogOpen = $state(false);
	let newRole = $state('sales');
	let newName = $state('');
	let newEmail = $state('');
	let newPassword = $state('');

	function closeCreateDialog() {
		createDialogOpen = false;
		newRole = 'sales';
		newName = '';
		newEmail = '';
		newPassword = '';
	}

	$effect(() => {
		if (form?.success && form?.created) {
			toast.success('User created successfully');
			closeCreateDialog();
		} else if (form?.success) {
			toast.success('User updated');
		}
		if (form?.error) toast.error(form.error);
	});

	const roleColors: Record<string, string> = {
		admin: 'bg-primary text-primary-foreground',
		sales: 'bg-blue-600 text-white',
		warehouse: 'bg-amber-600 text-white'
	};

	const processedUsers = $derived(
		data.users.map((row: any) => ({
			id: row.id,
			name: row.name,
			email: row.email,
			role: row.role,
			emailVerified: row.emailVerified,
			createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
		}))
	);

	const cardColumns = [
		{ key: 'name',      label: 'Name',     primary: true },
		{ key: 'email',     label: 'Email',    secondary: true },
		{ key: 'role',      label: 'Role',     badge: true,
			badgeClass: (v: unknown) => roleColors[String(v)] ?? 'bg-muted text-foreground' },
		{ key: 'createdAt', label: 'Joined' },
	];

	const cardActions: ActionsInput = (row) => {
		const allRoles = ['admin', 'sales', 'warehouse'];
		const roleActions = allRoles
			.filter(r => r !== row.role)
			.map(r => ({
				label: `Change to ${r}`,
				onClick: async (r2: any) => {
					const fd = new FormData();
					fd.set('userId', r2.id);
					fd.set('role', r);
					await fetch('?/updateRole', { method: 'POST', body: fd });
					await invalidateAll();
				},
			}));

		const toggleLabel = row.emailVerified ? 'Deactivate' : 'Reactivate';
		const toggleAction = {
			label: toggleLabel,
			variant: (row.emailVerified ? 'destructive' : 'default') as 'destructive' | 'default',
			onClick: async (r2: any) => {
				const fd = new FormData();
				fd.set('userId', r2.id);
				await fetch('?/toggleVerified', { method: 'POST', body: fd });
				await invalidateAll();
			},
		};

		return [...roleActions, toggleAction];
	};
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-12">
	<header class="flex justify-between items-end border-b-2 border-foreground pb-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-4 relative w-full">
			<div class="flex items-center gap-3 mb-2">
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">Settings / Admin</span>
			</div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				User<br /><span class="text-muted-foreground/40 italic">Management</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.users.length} registered {data.users.length === 1 ? 'user' : 'users'}
			</p>
		</div>
		<Dialog.Root bind:open={createDialogOpen}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						class="hidden md:flex h-12 px-6 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] whitespace-nowrap"
					>
						<Plus class="w-4 h-4 mr-2" /> Add User
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content class="rounded-none border-2 border-foreground sm:max-w-md" onInteractOutside={closeCreateDialog} onEscapeKeydown={closeCreateDialog}>
				<Dialog.Header>
					<Dialog.Title class="text-xl font-black tracking-tighter uppercase">Create New User</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground tracking-widest uppercase">
						Add a new user account to the system.
					</Dialog.Description>
				</Dialog.Header>
				<form method="POST" action="?/createUser" use:enhance class="space-y-4 pt-2">
					<div class="space-y-1.5">
						<Label for="new-name" class="text-xs font-bold uppercase tracking-widest">Full Name</Label>
						<Input id="new-name" name="name" bind:value={newName} placeholder="John Doe" required class="rounded-none border-2 h-11" />
					</div>
					<div class="space-y-1.5">
						<Label for="new-email" class="text-xs font-bold uppercase tracking-widest">Email</Label>
						<Input id="new-email" name="email" type="email" bind:value={newEmail} placeholder="john@example.com" required class="rounded-none border-2 h-11" />
					</div>
					<div class="space-y-1.5">
						<Label for="new-password" class="text-xs font-bold uppercase tracking-widest">Password</Label>
						<Input id="new-password" name="password" type="password" bind:value={newPassword} placeholder="Min. 8 characters" required minlength={8} maxlength={128} class="rounded-none border-2 h-11" />
					</div>
					<div class="space-y-1.5">
						<Label class="text-xs font-bold uppercase tracking-widest">Role</Label>
						<input type="hidden" name="role" value={newRole} />
						<Select.Root type="single" bind:value={newRole}>
							<Select.Trigger class="rounded-none border-2 h-11 w-full font-bold uppercase tracking-widest text-xs">
								{newRole}
							</Select.Trigger>
							<Select.Content class="rounded-none border-2 border-foreground/10">
								<Select.Item value="sales" class="font-bold uppercase tracking-widest text-xs">Sales</Select.Item>
								<Select.Item value="warehouse" class="font-bold uppercase tracking-widest text-xs">Warehouse</Select.Item>
								<Select.Item value="admin" class="font-bold uppercase tracking-widest text-xs">Admin</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<Dialog.Footer class="pt-2">
						<Button type="button" variant="outline" onclick={closeCreateDialog} class="rounded-none border-2 font-bold uppercase tracking-widest text-xs h-11">
							Cancel
						</Button>
						<Button type="submit" class="rounded-none font-bold uppercase tracking-widest text-xs h-11 bg-foreground text-background hover:bg-primary">
							Create User
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</header>

	<div class="md:hidden">
		<DataCards columns={cardColumns} data={processedUsers} actions={cardActions} emptyMessage="No users found." />
	</div>
	<section class="hidden md:block border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Users class="w-4 h-4 text-primary" /> All Users
			</h2>
		</div>

		<Table.Root class="w-full text-left border-collapse">
			<Table.Header>
				<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Name</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">Email</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Role</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell">Status</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell">Joined</Table.Head>
					<Table.Head class="w-[120px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.users as u}
					<Table.Row class="group hover:bg-muted/30 transition-colors border-b border-border/50 {!u.emailVerified ? 'opacity-60' : ''}">
						<Table.Cell class="px-6 py-4">
							<div class="flex flex-col">
								<span class="font-bold text-base tracking-tight">{u.name}</span>
								{#if u.id === data.currentUserId}
									<span class="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">You</span>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 hidden md:table-cell">
							<span class="font-mono text-sm text-foreground/70">{u.email}</span>
						</Table.Cell>
						<Table.Cell class="px-6 py-4">
							<span class="inline-block px-2 py-0.5 text-[10px] font-black tracking-widest uppercase {roleColors[u.role] ?? 'bg-muted text-foreground'}">
								{u.role}
							</span>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 hidden lg:table-cell">
							{#if u.emailVerified}
								<span class="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-widest">
									<CheckCircle class="w-3.5 h-3.5" /> Active
								</span>
							{:else}
								<span class="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
									<XCircle class="w-3.5 h-3.5" /> Inactive
								</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="px-6 py-4 hidden lg:table-cell">
							<span class="font-mono text-xs text-foreground/50">{new Date(u.createdAt).toLocaleDateString()}</span>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-right">
							{#if u.id !== data.currentUserId}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button
												{...props}
												variant="outline"
												size="sm"
												class="h-8 text-[10px] font-bold uppercase tracking-widest px-3 flex items-center justify-between min-w-[95px] rounded-none border-2 border-foreground/10 hover:border-foreground/30 transition-colors shadow-[2px_2px_0px_0px_theme(colors.foreground/5%)]"
											>
												Actions <ChevronDown class="h-3.5 w-3.5 ml-2 opacity-50" />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-52 rounded-none border-2 border-foreground/10 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground/10%)] p-2">
										<div class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground/40 border-b border-border/50 mb-2">
											Change Role
										</div>
										{#each ['admin', 'sales', 'warehouse'] as role}
											{#if role !== u.role}
												<form method="POST" action="?/updateRole" use:enhance>
													<input type="hidden" name="userId" value={u.id} />
													<input type="hidden" name="role" value={role} />
													<button
														type="submit"
														class="w-full flex items-center text-xs font-bold uppercase tracking-wider cursor-pointer h-9 px-3 hover:bg-muted focus:bg-muted outline-none text-left gap-2"
													>
														<Shield class="w-3.5 h-3.5 opacity-60" />
														Set as {role}
													</button>
												</form>
											{/if}
										{/each}

										<DropdownMenu.Separator class="bg-border/50 -mx-2 my-2" />

										<form method="POST" action="?/toggleVerified" use:enhance>
											<input type="hidden" name="userId" value={u.id} />
											<button
												type="submit"
												class="w-full flex items-center text-xs font-bold uppercase tracking-wider cursor-pointer h-9 px-3 hover:bg-muted focus:bg-muted outline-none text-left gap-2 {u.emailVerified ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}"
											>
												{#if u.emailVerified}
													<XCircle class="w-3.5 h-3.5" /> Deactivate
												{:else}
													<CheckCircle class="w-3.5 h-3.5" /> Reactivate
												{/if}
											</button>
										</form>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{:else}
								<span class="text-xs text-muted-foreground/40 italic px-2">—</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-48 text-center align-middle">
							<p class="text-muted-foreground/40 uppercase tracking-widest text-sm font-bold">No users found</p>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</section>
</div>

<PageFAB label="Invite user" onclick={() => createDialogOpen = true} />
