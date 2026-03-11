<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { Languages, Search } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';
	import { setLocale } from '$lib/paraglide/runtime';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { page } from '$app/state';

	// Helper to nicely format breadcrumb parts
	function formatSegment(segment: string) {
		return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
	}

	let pathSegments = $derived(
		page.url.pathname.split('/').filter((s) => Boolean(s) && s !== 'dashboard' && s !== 'catalog')
	);
</script>

<header class="bg-card flex h-14 items-center gap-4 border-b border-border/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
	<Sidebar.Trigger class="md:hidden" />

	<div class="flex items-center gap-4 w-full lg:ml-4">
		<!-- Dynamic Breadcrumbs -->
		<Breadcrumb.Root class="hidden md:flex">
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/dashboard" class="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Breadcrumb.Link>
				</Breadcrumb.Item>
				{#each pathSegments as segment, i}
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						{#if i === pathSegments.length - 1}
							<Breadcrumb.Page class="font-bold text-foreground">{formatSegment(segment)}</Breadcrumb.Page>
						{:else}
							<Breadcrumb.Link href={`/dashboard/${pathSegments.slice(0, i + 1).join('/')}`} class="text-muted-foreground hover:text-foreground transition-colors font-medium">{formatSegment(segment)}</Breadcrumb.Link>
						{/if}
					</Breadcrumb.Item>
				{/each}
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<form class="flex-1 max-w-md ml-auto">
			<div class="relative group">
				<Search class="text-muted-foreground/50 absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors group-focus-within:text-foreground" />
				<Input
					type="search"
					placeholder={typeof m.search_placeholder === 'function' ? m.search_placeholder() : 'Search...'}
					class="bg-transparent border-0 border-b border-transparent focus-visible:border-border/40 w-full appearance-none pl-7 rounded-none shadow-none text-sm focus-visible:ring-0 transition-all font-medium"
				/>
			</div>
		</form>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" size="icon" class="h-8 w-8 rounded-full">
					<Languages class="h-4 w-4" />
					<span class="sr-only">Toggle language</span>
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onclick={() => setLocale('en')}>
				English
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => setLocale('am')}>
				አማርኛ (Amharic)
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</header>
