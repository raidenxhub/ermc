<script lang="ts">
  export let data;
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="mb-6">
    <h1 class="text-3xl font-bold">Events (Coordinator)</h1>
    <p class="text-muted-foreground">View ERMC events and open roster slots.</p>
    <form method="POST" action="?/sync" class="mt-4">
      <button class="btn btn-secondary">Sync VATSIM Events</button>
    </form>
  </div>

  {#if data.events.length === 0}
    <p class="text-sm text-muted-foreground">No events found.</p>
  {:else}
    <div class="space-y-4">
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

