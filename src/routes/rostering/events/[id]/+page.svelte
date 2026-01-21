<script lang="ts">
  import { browser } from '$app/environment';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import { createClient } from '@supabase/supabase-js';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { toast } from 'svelte-sonner';
  import { Check, X } from 'lucide-svelte';
  import { eventsSyncing } from '$lib/stores/eventsSync';
  import { confirm } from '$lib/confirm';

  export let data;
  const positionOrder = ['DEL', 'GND', 'TWR', 'APP', 'CTR'];
  const minRatingByPos = { DEL: 2, GND: 2, TWR: 3, APP: 4, CTR: 5 } as const;
  const getMinRating = (code: string) => {
    if (code === 'DEL') return 2;
    if (code === 'GND') return 2;
    if (code === 'TWR') return 3;
    if (code === 'APP') return 4;
    if (code === 'CTR') return 5;
    return null;
  };

  const posCode = (value: unknown) => {
    const raw = typeof value === 'string' ? value : '';
    const last = raw.includes('_') ? raw.split('_').pop() : raw;
    const code = (last || '').toUpperCase();
    return positionOrder.includes(code) ? code : code;
  };

  const posLabel = (code: string) => {
    if (code === 'DEL') return 'DELIVERY';
    if (code === 'GND') return 'GROUND';
    if (code === 'TWR') return 'TOWER';
    if (code === 'APP') return 'APPROACH';
    if (code === 'CTR') return 'CENTER';
    return code;
  };

  const myRating = () => {
    const r = Number((data?.me as any)?.rating);
    return Number.isFinite(r) ? r : 0;
  };

  const _isEligibleForEntry = (entry: any) => {
    if (!entry) return false;
    if (entry.user_id) return true;
    if (data?.isStaff) return true;
    const code = posCode(entry.position);
    const min = getMinRating(code);
    if (!min) return false;
    const ratingOk = myRating() >= min;
    const hasCid = !!(data?.me as any)?.cid;
    if (!ratingOk || !hasCid) return false;

    const eventStart = new Date(data?.event?.start_time || '').getTime();
    const now = Date.now();
    if (!Number.isFinite(eventStart)) return false;
    if (String(data?.event?.status || '') === 'cancelled') return false;
    if (now > eventStart - 15 * 60 * 1000) return false;
    return true;
  };

  let sortedRoster: any[] = [];

  const rosterSort = (a: any, b: any) => {
    const ar = positionOrder.indexOf(posCode(a.position) as any);
    const br = positionOrder.indexOf(posCode(b.position) as any);
    if (ar !== br) return ar - br;
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  };

  $: sortedRoster = ([...(data?.roster || [])] as any[]).sort(rosterSort);

  const fmtUtc = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toUTCString();
  };

  const confirmBooking = async (kind: 'primary' | 'standby', entry: any) => {
    const eventName = String(data?.event?.name || 'Event');
    const position = String(entry?.position || '');
    const airport = String(entry?.airport || '');
    const start = fmtUtc(String(entry?.start_time || ''));
    const end = fmtUtc(String(entry?.end_time || ''));
    const bookingType = kind === 'primary' ? 'Primary booking' : 'Standby request';
    const message = [
      bookingType,
      '',
      `Event: ${eventName}`,
      `Airport: ${airport}`,
      `Position: ${position}`,
      `Time (UTC): ${start} – ${end}`,
      '',
      kind === 'primary'
        ? 'By confirming, you will claim this slot immediately if it is still available.'
        : 'By confirming, you will be added to standby for this slot (not guaranteed).'
    ].join('\n');
    return confirm({ title: 'Confirm booking', message, confirmText: 'Confirm', cancelText: 'Cancel' });
  };

  const confirmCancelBooking = async (entry: any) => {
    const eventName = String(data?.event?.name || 'Event');
    const position = String(entry?.position || '');
    const airport = String(entry?.airport || '');
    const start = fmtUtc(String(entry?.start_time || ''));
    const end = fmtUtc(String(entry?.end_time || ''));
    const message = [
      `Event: ${eventName}`,
      `Airport: ${airport}`,
      `Position: ${position}`,
      `Time (UTC): ${start} – ${end}`,
      '',
      'Are you sure you want to cancel this booking?'
    ].join('\n');
    return confirm({ title: 'Cancel booking', message, confirmText: 'Cancel booking', cancelText: 'Keep booking' });
  };

  const standbyClaimsFor = (entryId: string) =>
    ((data?.claims || []) as any[])
      .filter((c: any) => c?.roster_entry_id === entryId && c?.type === 'standby')
      .sort((a: any, b: any) => {
        const at = new Date(a?.created_at || 0).getTime();
        const bt = new Date(b?.created_at || 0).getTime();
        return at - bt;
      });

  let managedRoster = true;
  let deleteCountdown = '';
  $: {
    const raw = (data.event?.airports || '') as string;
    const airports = raw
      ? raw.split(',').map((a: string) => a.trim().toUpperCase()).filter(Boolean)
      : [];
    managedRoster = airports.length === 0 ? true : airports.some((a: string) => ['OBBI', 'OKKK'].includes(a));
  }

  type SubmitState = 'idle' | 'loading' | 'success' | 'error';
  let formStates: Record<string, SubmitState> = {};
  type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

  const setFormState = (key: string, state: SubmitState) => {
    formStates = { ...formStates, [key]: state };
  };

  const getFormState = (key: string): SubmitState => formStates[key] || 'idle';

  const useFormEnhance = (
    formEl: HTMLFormElement,
    params: { key: string; successToast?: string; confirm?: () => Promise<boolean> }
  ) => {
    if (!browser) return;
    const submit: SubmitFunction = async ({ cancel }) => {
      if (params.confirm) {
        setFormState(params.key, 'loading');
        const ok = await params.confirm();
        if (!ok) {
          cancel();
          setFormState(params.key, 'idle');
          return;
        }
        // Optimistic success immediately after confirmation
        setFormState(params.key, 'success');
        // Trigger immediate data refresh for everyone
        await invalidateAll();
      } else {
        setFormState(params.key, 'loading');
      }
      return async ({ result, update }) => {
        await update({ reset: false });
        if (result.type === 'success') {
          if (params.successToast) toast.success(params.successToast);
          await invalidateAll();
          // Keep success briefly, then reset to idle so buttons return to normal
          setTimeout(() => setFormState(params.key, 'idle'), 800);
          return;
        }
        if (result.type === 'failure') {
          setFormState(params.key, 'error');
          const message = (result.data as { message?: string })?.message || 'Request failed.';
          toast.error(message);
          await invalidateAll();
          setTimeout(() => setFormState(params.key, 'idle'), 1200);
          return;
        }
        setFormState(params.key, 'idle');
      };
    };
    return enhance(formEl, submit);
  };

  onMount(() => {
    if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
    const rosterChannel = supabase
      .channel(`roster:${data.event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roster_entries', filter: `event_id=eq.${data.event.id}` },
        async () => {
          await invalidateAll();
        }
      )
      .subscribe();

    const eventChannel = supabase
      .channel(`event:${data.event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${data.event.id}` },
        async () => {
          await invalidateAll();
        }
      )
      .subscribe();

    const tick = () => {
      const deleteAt = (data.event as any)?.delete_at as string | null | undefined;
      const isCancelled = (data.event as any)?.status === 'cancelled';
      if (!isCancelled || !deleteAt) {
        deleteCountdown = '';
        return;
      }
      const ms = new Date(deleteAt).getTime() - Date.now();
      if (!Number.isFinite(ms)) {
        deleteCountdown = '';
        return;
      }
      if (ms <= 0) {
        deleteCountdown = 'Deleting...';
        void invalidateAll();
        return;
      }
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      deleteCountdown = `${minutes}:${String(seconds).padStart(2, '0')}`;
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(rosterChannel);
      supabase.removeChannel(eventChannel);
    };
  });
</script>

<div class="container mx-auto px-4 py-8 max-w-5xl space-y-6">
  {#if $eventsSyncing}
    <div class="flex items-center justify-center">
      <span class="loader" style="transform: scale(0.5); transform-origin: center;"></span>
    </div>
  {/if}
  {#if !managedRoster}
    <div role="alert" class="alert alert-info">
      <span>This roster is handled by another vACC for this event.</span>
    </div>
  {/if}
  {#if data.event?.status === 'cancelled'}
    <div role="alert" class="alert alert-error">
      <span>
        This event has been cancelled. Booking is closed.
        {#if deleteCountdown}
          It will be auto-deleted in {deleteCountdown}.
        {/if}
      </span>
    </div>
  {/if}
  <div>
    <h1 class="text-3xl font-bold">{data.event.name}</h1>
    <p class="text-sm text-muted-foreground">{new Date(data.event.start_time).toUTCString()} – {new Date(data.event.end_time).toUTCString()}</p>
    {#if data.event.link}
      <a href={data.event.link} target="_blank" class="btn btn-outline btn-primary mt-2">External Link</a>
    {/if}
	{#if data.isStaff}
		<a href={`/events/mgmt/${data.event.id}`} class="btn btn-ghost mt-2">Manage this event</a>
	{/if}
  </div>

  <div class="rounded-xl border bg-card text-card-foreground shadow">
    <div class="flex flex-col space-y-1.5 p-6">
      <h3 class="font-semibold leading-none tracking-tight">Event Roster</h3>
      <p class="text-sm text-muted-foreground">List of controllers registered for this event.</p>
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
              {#each sortedRoster as entry, idx (entry.id)}
                {#if idx === 0 || posCode(entry.position) !== posCode(sortedRoster[idx - 1]?.position)}
                  <tr class="border-b bg-muted/30">
                    <td colspan="7" class="px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground">
                      {posLabel(posCode(entry.position))} ({posCode(entry.position)})
                    </td>
                  </tr>
                {/if}
                <tr class="border-b">
                  <td class="p-4 align-middle font-medium border-l-4 border-error pl-3">
                    <div class="flex flex-col">
                      <span class="text-xs text-muted-foreground">{posCode(entry.position)}</span>
                      <span>{posLabel(posCode(entry.position))}</span>
                    </div>
                  </td>
                  <td class="p-4 align-middle">{entry.airport}</td>
                  <td class="p-4 align-middle">{entry.user?.name || 'Open'}</td>
                  <td class="p-4 align-middle">{entry.user?.cid || '-'}</td>
                  <td class="p-4 align-middle">{entry.user?.rating_short || '-'}</td>
                  <td class="p-4 align-middle">{new Date(entry.start_time).toUTCString()} – {new Date(entry.end_time).toUTCString()}</td>
                  <td class="p-4 align-middle">
                    {#key entry.id}
                      {#if !entry.user}
                        {#if data.event?.status === 'cancelled'}
                             <span class="badge badge-ghost opacity-50">Event Cancelled</span>
                        {:else if new Date().getTime() > new Date(data.event.start_time).getTime() - 15 * 60 * 1000}
                             <span class="badge badge-ghost opacity-50">Booking Closed</span>
                        {:else}
                            <div class="flex gap-2">
                            <form
                              method="POST"
                              action="?/claim_primary"
                              use:useFormEnhance={{ key: `claim_primary:${entry.id}`, successToast: 'Claimed.', confirm: () => confirmBooking('primary', entry) }}
                            >
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <button
                                  class="btn ermc-state-btn btn-sm {getFormState(`claim_primary:${entry.id}`) === 'success' ? 'ermc-success-btn' : getFormState(`claim_primary:${entry.id}`) === 'error' ? 'btn-error' : 'btn-primary'}"
                                  disabled={getFormState(`claim_primary:${entry.id}`) === 'loading' || getFormState(`claim_primary:${entry.id}`) === 'success'}
                                >
                                  {#if getFormState(`claim_primary:${entry.id}`) === 'loading'}
                                    <span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
                                  {:else if getFormState(`claim_primary:${entry.id}`) === 'success'}
                                    <span class="ermc-icon-slide-in"><Check size={16} /></span>
                                  {:else if getFormState(`claim_primary:${entry.id}`) === 'error'}
                                    <X size={16} />
                                  {:else}
                                    Claim Primary
                                  {/if}
                                </button>
                            </form>
                            <form
                              method="POST"
                              action="?/claim_standby"
                              use:useFormEnhance={{
                                key: `claim_standby:${entry.id}`,
                                successToast: 'Standby requested.',
                                confirm: () => confirmBooking('standby', entry)
                              }}
                            >
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <button
                                  class="btn ermc-state-btn btn-sm {getFormState(`claim_standby:${entry.id}`) === 'success' ? 'ermc-success-btn' : getFormState(`claim_standby:${entry.id}`) === 'error' ? 'btn-error' : 'btn-outline'}"
                                  disabled={getFormState(`claim_standby:${entry.id}`) === 'loading' || getFormState(`claim_standby:${entry.id}`) === 'success'}
                                >
                                  {#if getFormState(`claim_standby:${entry.id}`) === 'loading'}
                                    <span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
                                  {:else if getFormState(`claim_standby:${entry.id}`) === 'success'}
                                    <span class="ermc-icon-slide-in"><Check size={16} /></span>
                                  {:else if getFormState(`claim_standby:${entry.id}`) === 'error'}
                                    <X size={16} />
                                  {:else}
                                    Claim Standby
                                  {/if}
                                </button>
                            </form>
                            </div>
                            {#if standbyClaimsFor(entry.id).length > 0}
                              <details class="mt-2">
                                <summary class="cursor-pointer text-xs text-muted-foreground">
                                  View standby list ({standbyClaimsFor(entry.id).length})
                                </summary>
                                <div class="mt-2 space-y-1 text-xs">
                                  {#each standbyClaimsFor(entry.id) as claim (claim.id)}
                                    <div class="flex items-center justify-between rounded-md border px-2 py-1">
                                      <span class="font-medium">{claim.user?.name || claim.user?.cid || 'User'}</span>
                                      <span class="text-muted-foreground">{claim.user?.rating_short || ''}{#if claim.user?.cid} • {claim.user.cid}{/if}</span>
                                    </div>
                                  {/each}
                                </div>
                              </details>
                            {/if}
                        {/if}
                      {:else}
                        {#if entry.user?.id === data.me.id}
                          {#if new Date(entry.start_time).getTime() - Date.now() > 60 * 60 * 1000}
                            <form
                              method="POST"
                              action="?/cancel_claim"
                              use:useFormEnhance={{ key: `cancel_claim:${entry.id}`, successToast: 'Cancelled.', confirm: () => confirmCancelBooking(entry) }}
                            >
                              <input type="hidden" name="roster_entry_id" value={entry.id} />
                              <button
                                class="btn ermc-state-btn btn-sm {getFormState(`cancel_claim:${entry.id}`) === 'success' ? 'ermc-success-btn' : getFormState(`cancel_claim:${entry.id}`) === 'error' ? 'btn-error' : 'btn-error'}"
                                disabled={getFormState(`cancel_claim:${entry.id}`) === 'loading' || getFormState(`cancel_claim:${entry.id}`) === 'success'}
                              >
                                {#if getFormState(`cancel_claim:${entry.id}`) === 'loading'}
                                  <span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
                                {:else if getFormState(`cancel_claim:${entry.id}`) === 'success'}
                                  <span class="ermc-icon-slide-in"><Check size={16} /></span>
                                {:else if getFormState(`cancel_claim:${entry.id}`) === 'error'}
                                  <X size={16} />
                                {:else}
                                  Cancel
                                {/if}
                              </button>
                            </form>
                          {:else}
                            <span class="text-xs text-muted-foreground">Not cancellable (&lt; 60m)</span>
                          {/if}
                        {:else}
                          {#if data.event?.status === 'cancelled'}
                            <span class="badge badge-ghost opacity-50">Event Cancelled</span>
                          {:else}
                          <div class="flex items-center gap-2">
                            <form
                              method="POST"
                              action="?/claim_standby"
                              use:useFormEnhance={{ key: `standby:${entry.id}`, successToast: 'Standby requested.', confirm: () => confirmBooking('standby', entry) }}
                            >
                              <input type="hidden" name="roster_entry_id" value={entry.id} />
                              <button
                                class="btn ermc-state-btn btn-sm {getFormState(`standby:${entry.id}`) === 'success' ? 'ermc-success-btn' : getFormState(`standby:${entry.id}`) === 'error' ? 'btn-error' : 'btn-outline'}"
                                disabled={getFormState(`standby:${entry.id}`) === 'loading' || getFormState(`standby:${entry.id}`) === 'success'}
                              >
                                {#if getFormState(`standby:${entry.id}`) === 'loading'}
                                  <span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
                                {:else if getFormState(`standby:${entry.id}`) === 'success'}
                                  <span class="ermc-icon-slide-in"><Check size={16} /></span>
                                {:else if getFormState(`standby:${entry.id}`) === 'error'}
                                  <X size={16} />
                                {:else}
                                  Standby
                                {/if}
                              </button>
                            </form>
                            <span class="badge badge-neutral">{standbyClaimsFor(entry.id).length} standby</span>
                            {#if entry.user?.id}
                              <form method="POST" action="?/knock" use:useFormEnhance={{ key: `knock:${entry.id}`, successToast: 'Knock sent.' }}>
                                <input type="hidden" name="event_id" value={data.event.id} />
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <input type="hidden" name="to_user_id" value={entry.user.id} />
                                <button
                                  class="btn ermc-state-btn btn-sm {getFormState(`knock:${entry.id}`) === 'success' ? 'ermc-success-btn' : getFormState(`knock:${entry.id}`) === 'error' ? 'btn-error' : 'btn-primary'}"
                                  disabled={getFormState(`knock:${entry.id}`) === 'loading' || getFormState(`knock:${entry.id}`) === 'success'}
                                >
                                  {#if getFormState(`knock:${entry.id}`) === 'loading'}
                                    <span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
                                  {:else if getFormState(`knock:${entry.id}`) === 'success'}
                                    <span class="ermc-icon-slide-in"><Check size={16} /></span>
                                  {:else if getFormState(`knock:${entry.id}`) === 'error'}
                                    <X size={16} />
                                  {:else}
                                    Knock
                                  {/if}
                                </button>
                              </form>
                            {/if}
                          </div>
                          {#if standbyClaimsFor(entry.id).length > 0}
                            <details class="mt-2">
                              <summary class="cursor-pointer text-xs text-muted-foreground">
                                View standby list
                              </summary>
                              <div class="mt-2 space-y-1 text-xs">
                                {#each standbyClaimsFor(entry.id) as claim (claim.id)}
                                  <div class="flex items-center justify-between rounded-md border px-2 py-1">
                                    <span class="font-medium">{claim.user?.name || claim.user?.cid || 'User'}</span>
                                    <span class="text-muted-foreground">{claim.user?.rating_short || ''}{#if claim.user?.cid} • {claim.user.cid}{/if}</span>
                                  </div>
                                {/each}
                              </div>
                            </details>
                          {/if}
                          {/if}
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
