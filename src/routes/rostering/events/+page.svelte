<script lang="ts">
  import { browser } from '$app/environment';
  import { enhance } from '$app/forms';
  import { toast } from 'svelte-sonner';
  import { Check, X, RefreshCw } from 'lucide-svelte';
  import { eventsSyncing } from '$lib/stores/eventsSync';

  export let data;

  let syncState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

  const useEnhanceSync = (formEl: HTMLFormElement) => {
    if (!browser) return;
    const submit: SubmitFunction = () => {
      syncState = 'loading';
      return async ({ result, update }) => {
        if (result.type === 'success') {
          syncState = 'success';
          toast.success('Synced events.');
          await update();
          setTimeout(() => (syncState = 'idle'), 2000);
          return;
        }

        await update();
        syncState = 'error';
        toast.error('Failed to sync events.');
        setTimeout(() => (syncState = 'idle'), 2000);
      };
    };
    return enhance(formEl, submit);
  };
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">Events (Coordinator)</h1>
    <p class="text-muted-foreground">View ERMC events and open roster slots.</p>
    <form method="POST" action="?/sync" class="mt-4" use:useEnhanceSync>
      <button
        class="btn ermc-state-btn {syncState === 'success' ? 'ermc-success-btn' : syncState === 'error' ? 'btn-error' : 'btn-secondary'}"
        disabled={syncState === 'loading' || syncState === 'success'}
      >
        {#if syncState === 'loading'}
          <span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
        {:else if syncState === 'success'}
          <span class="ermc-icon-slide-in"><Check size={18} /></span>
        {:else if syncState === 'error'}
          <X size={18} />
        {:else}
          <RefreshCw size={18} /> Sync VATSIM Events
        {/if}
      </button>
    </form>
  </div>

  {#if data.events.length === 0}
    <p class="text-sm text-muted-foreground">No events found.</p>
  {:else}
    <div class="space-y-4 relative">
      {#if $eventsSyncing}
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
          <span class="loader"></span>
        </div>
      {/if}
      {#each data.events as event}
        <div class="rounded-xl border bg-card text-card-foreground shadow p-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-semibold">{event.name}</h2>
              <p class="text-sm text-muted-foreground">{new Date(event.start_time).toUTCString()}</p>
            </div>
            <div class="flex gap-2">
              {#if event.link}
                <a href={event.link} target="_blank" class="btn btn-outline btn-secondary">External</a>
              {/if}
              <a href={`/coordination/events/${event.id}`} class="btn btn-primary">Details</a>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
