<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  export let data;

  let { supabase, session, user } = data;
  $: ({ supabase, session, user } = data);

  onMount(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== session?.expires_at) {
        // invalidate('supabase:auth');
        // Reload page logic here if needed, or just let sveltekit handle it
      }
    });

    // Subscribe to real-time knocks for current user
    const channel = supabase
      .channel('knocks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'knocks' }, (payload) => {
        const row = payload.new as { to_user_id?: string };
        if (row?.to_user_id && user && row.to_user_id === user.id) {
          try {
            const ctx = new AudioContext();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 880;
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.setValueAtTime(0.001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
            o.start();
            setTimeout(() => {
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
              o.stop(ctx.currentTime + 0.25);
            }, 200);
          } catch { void 0; }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  });
</script>

<slot />
