<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { Languages, Search } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';
	import { setLocale } from '$lib/paraglide/runtime';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
</script>

<header class="bg-background flex h-14 items-center gap-4 border-b px-4 lg:h-[60px] lg:px-6">
	<Sidebar.Trigger class="md:hidden" />

	<div class="flex-1 w-full lg:ml-4">
		<form>
			<div class="relative group">
				<Search class="text-muted-foreground/50 absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors group-focus-within:text-foreground" />
				<Input
					type="search"
					placeholder={typeof m.search_placeholder === 'function' ? m.search_placeholder() : 'Search...'}
					class="bg-transparent border-0 border-b border-transparent focus-visible:border-border/40 w-full appearance-none pl-7 rounded-none shadow-none text-base focus-visible:ring-0 md:w-2/3 lg:w-1/3 transition-all"
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
