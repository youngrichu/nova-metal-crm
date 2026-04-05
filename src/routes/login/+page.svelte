<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { authClient } from "$lib/auth-client";
  import NovaLogo from "$lib/components/ui/NovaLogo.svelte";
  import { goto } from "$app/navigation";
  import * as m from "$lib/paraglide/messages";

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
      <NovaLogo class="mx-auto h-20 w-auto" idSuffix="login" />
      <h1 class="sr-only">{m.login_button()}</h1>
      <p class="text-muted-foreground">{m.login_subtitle()}</p>
    </div>
    
    {#if error}
      <div class="bg-destructive/15 text-destructive border-destructive/20 rounded-lg border p-3 text-sm">
        {error}
      </div>
    {/if}

    <form onsubmit={handleLogin} class="space-y-4">
      <div class="space-y-2">
        <Label for="email">{m.login_email()}</Label>
        <Input 
          id="email" 
          type="email" 
          bind:value={email}
          placeholder="admin@novametal.com" 
          required 
        />
      </div>
      <div class="space-y-2">
        <Label for="password">{m.login_password()}</Label>
        <Input 
          id="password" 
          type="password" 
          bind:value={password}
          required 
        />
      </div>
      <Button type="submit" class="w-full" disabled={loading}>
        {loading ? m.login_signing_in() : m.login_button()}
      </Button>
    </form>
  </div>
</div>
