<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { Toaster, toast } from 'svelte-sonner';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import CookieConsent from '$lib/components/CookieConsent.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { navigating, page } from '$app/stores';
  import { invalidate, invalidateAll } from '$app/navigation';
  import { browser } from '$app/environment';
  import { eventsSyncing } from '$lib/stores/eventsSync';

  export let data;

  let { supabase, user } = data;
  $: ({ supabase, user } = data);
  $: bannerUrls = Array.isArray(data?.bannerUrls) ? (data.bannerUrls as string[]) : [];
  $: canonicalUrl = $page.url.origin + $page.url.pathname;
  $: ogImageUrl = $page.url.origin + '/background.png';
  $: hideNavbar = $page.url.pathname.startsWith('/auth') || $page.url.pathname.startsWith('/onboarding') || $page.url.pathname.startsWith('/oauth') || $page.url.pathname.startsWith('/access-key');

  onMount(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      void event;
      void _session;
      invalidate('supabase:auth');
    });

    const pageUnsub = page.subscribe((p) => {
      const msg = p.url.searchParams.get('error');
      if (!msg) return;
      toast.error(msg);
      if (!browser) return;
      const next = new URL(p.url.toString());
      next.searchParams.delete('error');
      history.replaceState({}, '', next.pathname + (next.searchParams.toString() ? `?${next.searchParams.toString()}` : '') + next.hash);
    });

    const channel = supabase
      .channel('events:global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
        eventsSyncing.set(true);
        try {
          await invalidateAll();
        } finally {
          window.setTimeout(() => eventsSyncing.set(false), 400);
        }
      })
      .subscribe();

    const poll = async () => {
      eventsSyncing.set(true);
      try {
        await invalidateAll();
      } finally {
        window.setTimeout(() => eventsSyncing.set(false), 400);
      }
    };
    const pollInterval = window.setInterval(poll, 30_000);

    for (const url of bannerUrls) {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = url;
    }

    return () => {
      window.clearInterval(pollInterval);
      subscription.unsubscribe();
      pageUnsub();
      supabase.removeChannel(channel);
    };
  });
</script>



<svelte:head>
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImageUrl} />
  <meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<Toaster position="top-center" richColors class="z-[9999]" />

<div class="flex min-h-screen flex-col">
  <img
    src="/background.png"
    alt=""
    class="fixed inset-0 -z-20 h-full w-full object-cover object-center"
  />

  {#if !hideNavbar}
    <Navbar {user} navLoading={!!$navigating} />
  {/if}

  {#if $navigating}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <span class="loader"></span>
    </div>
  {/if}

  <main class="flex-1 min-h-dvh">
    <slot />
  </main>

  <Footer />
  <Toast />
  <CookieConsent />
  <ConfirmDialog />
</div>
