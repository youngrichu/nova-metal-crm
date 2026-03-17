<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { authClient } from "$lib/auth-client";
  import NovaLogo from "$lib/components/ui/NovaLogo.svelte";
  import { goto } from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let loading = $state(false);
  let error = $state("");

  async function handleLogin(e: Event) {
    e.preventDefault();
    loading = true;
    error = "";

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      error = signInError.message || "Failed to sign in";
      loading = false;
    } else {
      loading = false;
      goto("/dashboard");
    }
  }
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
  <div class="mx-auto w-full max-w-sm space-y-6">
    <div class="space-y-2 text-center">
      <NovaLogo class="mx-auto h-20 w-auto" />
      <h1 class="sr-only">Sign in</h1>
      <p class="text-muted-foreground">Enter your credentials to access the system</p>
    </div>
    
    {#if error}
      <div class="bg-destructive/15 text-destructive border-destructive/20 rounded-lg border p-3 text-sm">
        {error}
      </div>
    {/if}

    <form onsubmit={handleLogin} class="space-y-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          bind:value={email}
          placeholder="admin@novametal.com" 
          required 
        />
      </div>
      <div class="space-y-2">
        <Label for="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          bind:value={password}
          required 
        />
      </div>
      <Button type="submit" class="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  </div>
</div>
