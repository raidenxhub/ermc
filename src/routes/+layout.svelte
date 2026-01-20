<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import CookieConsent from '$lib/components/CookieConsent.svelte';
  import { navigating } from '$app/stores';

  export let data;

  let { supabase, session, user } = data;
  $: ({ supabase, session, user } = data);

  onMount(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== session?.expires_at) {
        // invalidate('supabase:auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  });
</script>

<Toaster position="top-right" richColors />

<div class="flex min-h-screen flex-col">
  <Navbar {user} />

  <main class="flex-1 relative">
    {#if $navigating}
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {/if}
    <slot />
  </main>

  <Footer />
  <CookieConsent />
</div>
