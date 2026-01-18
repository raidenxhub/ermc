<script lang="ts">
  export let data;
</script>

<div class="container mx-auto px-4 py-8 max-w-5xl space-y-6">
  <div>
    <h1 class="text-3xl font-bold">{data.event.name}</h1>
    <p class="text-sm text-muted-foreground">{new Date(data.event.start_time).toUTCString()} – {new Date(data.event.end_time).toUTCString()}</p>
    {#if data.event.link}
      <a href={data.event.link} target="_blank" class="btn btn-outline btn-primary mt-2">External Link</a>
    {/if}
  </div>

  <div class="rounded-xl border bg-card text-card-foreground shadow">
    <div class="flex flex-col space-y-1.5 p-6">
      <h3 class="font-semibold leading-none tracking-tight">Event Roster</h3>
      <p class="text-sm text-muted-foreground">Transparent list of controllers for coordination.</p>
    </div>
    <div class="p-6 pt-0">
      <div class="relative w-full overflow-auto">
        <table class="w-full caption-bottom text-sm">
          <thead class="[&_tr]:border-b">
            <tr class="border-b">
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Position</th>
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Airport</th>
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Controller</th>
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">CID</th>
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rating</th>
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
              <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody class="[&_tr:last-child]:border-0">
            {#if data.roster.length === 0}
              <tr>
                <td colspan="7" class="p-4 text-center text-muted-foreground">No roster entries found.</td>
              </tr>
            {:else}
              {#each data.roster as entry}
                <tr class="border-b">
                  <td class="p-4 align-middle font-medium">{entry.position}</td>
                  <td class="p-4 align-middle">{entry.airport}</td>
                  <td class="p-4 align-middle">{entry.user?.name || 'Open'}</td>
                  <td class="p-4 align-middle">{entry.user?.cid || '-'}</td>
                  <td class="p-4 align-middle">{entry.user?.rating_short || '-'}</td>
                  <td class="p-4 align-middle">{new Date(entry.start_time).toUTCString()} – {new Date(entry.end_time).toUTCString()}</td>
                  <td class="p-4 align-middle">
                    {#key entry.id}
                      {#if !entry.user}
                        <div class="flex gap-2">
                          <form method="POST" action="?/claim_primary">
                            <input type="hidden" name="roster_entry_id" value={entry.id} />
                            <button class="btn btn-sm btn-primary">Claim Primary</button>
                          </form>
                          <form method="POST" action="?/claim_standby">
                            <input type="hidden" name="roster_entry_id" value={entry.id} />
                            <button class="btn btn-sm btn-outline">Claim Standby</button>
                          </form>
                        </div>
                      {:else}
                        {#if entry.user?.id === data.me.id}
                          {#if new Date(entry.start_time).getTime() - Date.now() > 60 * 60 * 1000}
                            <form method="POST" action="?/cancel_claim">
                              <input type="hidden" name="roster_entry_id" value={entry.id} />
                              <button class="btn btn-sm btn-error">Cancel</button>
                            </form>
                          {:else}
                            <span class="text-xs text-muted-foreground">Not cancellable (&lt; 60m)</span>
                          {/if}
                        {:else}
                          <div class="flex items-center gap-2">
                            <form method="POST" action="?/claim_standby">
                              <input type="hidden" name="roster_entry_id" value={entry.id} />
                              <button class="btn btn-sm btn-outline">Standby</button>
                            </form>
                            <span class="badge badge-neutral">{(data.claims || []).filter((c) => c.roster_entry_id === entry.id && c.type === 'standby').length} standby</span>
                            {#if entry.user?.id}
                              <form method="POST" action="?/knock">
                                <input type="hidden" name="event_id" value={data.event.id} />
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <input type="hidden" name="to_user_id" value={entry.user.id} />
                                <button class="btn btn-sm">Knock</button>
                              </form>
                            {/if}
                          </div>
                        {/if}
                      {/if}
                    {/key}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
