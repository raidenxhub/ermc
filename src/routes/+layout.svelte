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
  import { beforeNavigate, goto, invalidate, invalidateAll } from '$app/navigation';
  import { browser } from '$app/environment';
  import { eventsSyncing } from '$lib/stores/eventsSync';

  export let data;

  let { supabase, user } = data;
  $: ({ supabase, user } = data);
  $: bannerUrls = Array.isArray(data?.bannerUrls) ? (data.bannerUrls as string[]) : [];
  $: canonicalUrl = $page.url.origin + $page.url.pathname;
  $: ogImageUrl = $page.url.origin + '/background.png';
  $: hideNavbar = $page.url.pathname.startsWith('/auth') || $page.url.pathname.startsWith('/onboarding') || $page.url.pathname.startsWith('/oauth') || $page.url.pathname.startsWith('/access-key');

  const titleForPath = (pathname: string) => {
    if (pathname === '/') return 'ERMC — Team rostering re-imagined';
    if (pathname.startsWith('/onboarding')) return 'ERMC — Onboarding';
    if (pathname.startsWith('/dashboard')) return 'ERMC — Dashboard';
    if (pathname.startsWith('/rostering/events/')) return 'ERMC — Event Rostering';
    if (pathname.startsWith('/rostering')) return 'ERMC — Rostering';
    if (pathname.startsWith('/coordination')) return 'ERMC — Coordination';
    if (pathname.startsWith('/events/mgmt')) return 'ERMC — Event Management';
    if (pathname.startsWith('/events')) return 'ERMC — Events';
    if (pathname.startsWith('/settings')) return 'ERMC — Settings';
    if (pathname.startsWith('/statistics')) return 'ERMC — Statistics';
    if (pathname.startsWith('/contact')) return 'ERMC — Contact';
    if (pathname.startsWith('/privacy')) return 'ERMC — Privacy Policy';
    if (pathname.startsWith('/terms-of-service')) return 'ERMC — Terms of Service';
    if (pathname.startsWith('/terms-of-use')) return 'ERMC — Terms of Use';
    if (pathname.startsWith('/auth/login')) return 'ERMC — Login';
    if (pathname.startsWith('/auth')) return 'ERMC — Authentication';
    if (pathname.startsWith('/oauth/consent')) return 'ERMC — Discord';
    if (pathname.startsWith('/access-key')) return 'ERMC — Restricted Access';
    return 'ERMC';
  };

  $: pageTitle = titleForPath($page.url.pathname);

  const isOnboardingComplete = (u: any) => !!(u?.ermc_access_granted && u?.cid && u?.rating && u?.name);

  onMount(() => {
    if (browser) {
      beforeNavigate(({ to, cancel, type }) => {
        if (!to) return;
        if (type !== 'link' && type !== 'popstate') return;
        const pathname = to.url.pathname;
        const allow =
          pathname.startsWith('/api/') ||
          pathname.startsWith('/_app/') ||
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/oauth/') ||
          pathname.startsWith('/onboarding');
        if (allow) return;
        if (user && !isOnboardingComplete(user)) {
          cancel();
          toast.warning('Complete your onboarding before attempting to access other pages.');
          const next = encodeURIComponent(to.url.pathname + to.url.search);
          void goto(`/onboarding?next=${next}`);
        }
      });
    }

    const subscription = supabase
      ? supabase.auth.onAuthStateChange((event, _session) => {
          void event;
          void _session;
          invalidate('supabase:auth');
        }).data.subscription
      : null;

    const pageUnsub = page.subscribe((p) => {
      const msg = p.url.searchParams.get('error');
      if (!msg) return;
      toast.error(msg);
      if (!browser) return;
      const next = new URL(p.url.toString());
      next.searchParams.delete('error');
      history.replaceState({}, '', next.pathname + (next.searchParams.toString() ? `?${next.searchParams.toString()}` : '') + next.hash);
    });

    if (!supabase) {
      return () => {
        pageUnsub();
      };
    }

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
      subscription?.unsubscribe();
      pageUnsub();
      supabase.removeChannel(channel);
    };
  });
</script>



<svelte:head>
  <link rel="canonical" href={canonicalUrl} />
  <title>{pageTitle}</title>
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:image" content={ogImageUrl} />
  <meta name="twitter:title" content={pageTitle} />
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
