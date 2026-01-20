<script lang="ts">
  import { browser } from '$app/environment';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import { createClient } from '@supabase/supabase-js';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { toast } from 'svelte-sonner';
  import { Check, X, LoaderCircle } from 'lucide-svelte';

  export let data;

  let allowedAirports: string[] = [];
  let managedRoster = true;
  $: {
    const raw = (data.event?.airports || '') as string;
    const airports = raw
      ? raw.split(',').map((a: string) => a.trim().toUpperCase()).filter(Boolean)
      : [];
    managedRoster = airports.length === 0 ? true : airports.some((a: string) => ['OBBI', 'OKKK'].includes(a));
  }
  $: {
      if (data.event.airports) {
          const eventAirports = data.event.airports.split(',').map((a: string) => a.trim().toUpperCase());
          allowedAirports = eventAirports.filter((a: string) => ['OBBI', 'OKKK'].includes(a));
      }
  }

  type SubmitState = 'idle' | 'loading' | 'success' | 'error';
  let formStates: Record<string, SubmitState> = {};
  type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

  const setFormState = (key: string, state: SubmitState) => {
    formStates = { ...formStates, [key]: state };
  };

  const getFormState = (key: string): SubmitState => formStates[key] || 'idle';

  const useFormEnhance = (formEl: HTMLFormElement, params: { key: string; successToast?: string }) => {
    if (!browser) return;
    const submit: SubmitFunction = () => {
      setFormState(params.key, 'loading');
      return async ({ result, update }) => {
        await update({ reset: false });

        if (result.type === 'success') {
          setFormState(params.key, 'success');
          if (params.successToast) toast.success(params.successToast);
          await invalidateAll();
          setTimeout(() => setFormState(params.key, 'idle'), 2000);
          return;
        }

        if (result.type === 'failure') {
          setFormState(params.key, 'error');
          const message = (result.data as { message?: string })?.message || 'Request failed.';
          toast.error(message);
          await invalidateAll();
          setTimeout(() => setFormState(params.key, 'idle'), 2000);
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
    const channel = supabase
      .channel(`roster:${data.event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roster_entries', filter: `event_id=eq.${data.event.id}` },
        async () => {
          await invalidateAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });
</script>

<div class="container mx-auto px-4 py-8 max-w-5xl space-y-6">
  {#if !managedRoster}
    <div role="alert" class="alert alert-info">
      <span>This roster is handled by another vACC for this event.</span>
    </div>
  {/if}
  {#if data.isStaff && allowedAirports.length > 0}
    <div class="rounded-xl border bg-card text-card-foreground shadow p-6">
        <h3 class="font-semibold text-lg mb-4">Manual Slot Management</h3>
        <form method="POST" action="?/add_slot" class="grid gap-4 md:grid-cols-5 items-end" use:useFormEnhance={{ key: `add_slot:${data.event.id}`, successToast: 'Slot added.' }}>
            <input type="hidden" name="event_id" value={data.event.id} />
            
            <div class="form-control w-full">
                <label class="label" for="manual_airport"><span class="label-text">Airport</span></label>
                <select id="manual_airport" name="airport" class="select select-bordered w-full">
                    {#each allowedAirports as apt}
                        <option value={apt}>{apt}</option>
                    {/each}
                </select>
            </div>

            <div class="form-control w-full">
                <label class="label" for="manual_position"><span class="label-text">Position</span></label>
                <select id="manual_position" name="position" class="select select-bordered w-full">
                    <option value="DEL">DEL</option>
                    <option value="GND">GND</option>
                    <option value="TWR">TWR</option>
                    <option value="APP">APP</option>
                    <option value="CTR">CTR</option>
                    <option value="STBY">STBY</option>
                </select>
            </div>

            <div class="form-control w-full">
                <label class="label" for="manual_start_time"><span class="label-text">Start Time</span></label>
                <input id="manual_start_time" type="datetime-local" name="start_time" class="input input-bordered w-full" value={new Date(data.event.start_time).toISOString().slice(0, 16)} />
            </div>

            <div class="form-control w-full">
                <label class="label" for="manual_end_time"><span class="label-text">End Time</span></label>
                <input id="manual_end_time" type="datetime-local" name="end_time" class="input input-bordered w-full" value={new Date(data.event.end_time).toISOString().slice(0, 16)} />
            </div>

            <button
              class="btn w-full {getFormState(`add_slot:${data.event.id}`) === 'success' ? 'btn-success' : getFormState(`add_slot:${data.event.id}`) === 'error' ? 'btn-error' : 'btn-primary'}"
              disabled={getFormState(`add_slot:${data.event.id}`) === 'loading' || getFormState(`add_slot:${data.event.id}`) === 'success'}
            >
              {#if getFormState(`add_slot:${data.event.id}`) === 'loading'}
                <LoaderCircle size={18} class="animate-spin" />
              {:else if getFormState(`add_slot:${data.event.id}`) === 'success'}
                <Check size={18} />
              {:else if getFormState(`add_slot:${data.event.id}`) === 'error'}
                <X size={18} />
              {:else}
                Add Slot
              {/if}
            </button>
        </form>
    </div>
  {/if}

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
                        {#if new Date().getTime() > new Date(data.event.start_time).getTime() - 15 * 60 * 1000}
                             <span class="badge badge-ghost opacity-50">Booking Closed</span>
                        {:else}
                            <div class="flex gap-2">
                            <form method="POST" action="?/claim_primary" use:useFormEnhance={{ key: `claim_primary:${entry.id}`, successToast: 'Claimed.' }}>
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <button
                                  class="btn btn-sm {getFormState(`claim_primary:${entry.id}`) === 'success' ? 'btn-success' : getFormState(`claim_primary:${entry.id}`) === 'error' ? 'btn-error' : 'btn-primary'}"
                                  disabled={getFormState(`claim_primary:${entry.id}`) === 'loading' || getFormState(`claim_primary:${entry.id}`) === 'success'}
                                >
                                  {#if getFormState(`claim_primary:${entry.id}`) === 'loading'}
                                    <LoaderCircle size={16} class="animate-spin" />
                                  {:else if getFormState(`claim_primary:${entry.id}`) === 'success'}
                                    <Check size={16} />
                                  {:else if getFormState(`claim_primary:${entry.id}`) === 'error'}
                                    <X size={16} />
                                  {:else}
                                    Claim Primary
                                  {/if}
                                </button>
                            </form>
                            <form method="POST" action="?/claim_standby" use:useFormEnhance={{ key: `claim_standby:${entry.id}`, successToast: 'Standby requested.' }}>
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <button
                                  class="btn btn-sm {getFormState(`claim_standby:${entry.id}`) === 'success' ? 'btn-success' : getFormState(`claim_standby:${entry.id}`) === 'error' ? 'btn-error' : 'btn-outline'}"
                                  disabled={getFormState(`claim_standby:${entry.id}`) === 'loading' || getFormState(`claim_standby:${entry.id}`) === 'success'}
                                >
                                  {#if getFormState(`claim_standby:${entry.id}`) === 'loading'}
                                    <LoaderCircle size={16} class="animate-spin" />
                                  {:else if getFormState(`claim_standby:${entry.id}`) === 'success'}
                                    <Check size={16} />
                                  {:else if getFormState(`claim_standby:${entry.id}`) === 'error'}
                                    <X size={16} />
                                  {:else}
                                    Claim Standby
                                  {/if}
                                </button>
                            </form>
                            </div>
                        {/if}
                      {:else}
                        {#if entry.user?.id === data.me.id}
                          {#if new Date(entry.start_time).getTime() - Date.now() > 60 * 60 * 1000}
                            <form method="POST" action="?/cancel_claim" use:useFormEnhance={{ key: `cancel_claim:${entry.id}`, successToast: 'Cancelled.' }}>
                              <input type="hidden" name="roster_entry_id" value={entry.id} />
                              <button
                                class="btn btn-sm {getFormState(`cancel_claim:${entry.id}`) === 'success' ? 'btn-success' : getFormState(`cancel_claim:${entry.id}`) === 'error' ? 'btn-error' : 'btn-error'}"
                                disabled={getFormState(`cancel_claim:${entry.id}`) === 'loading' || getFormState(`cancel_claim:${entry.id}`) === 'success'}
                              >
                                {#if getFormState(`cancel_claim:${entry.id}`) === 'loading'}
                                  <LoaderCircle size={16} class="animate-spin" />
                                {:else if getFormState(`cancel_claim:${entry.id}`) === 'success'}
                                  <Check size={16} />
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
                          <div class="flex items-center gap-2">
                            <form method="POST" action="?/claim_standby" use:useFormEnhance={{ key: `standby:${entry.id}`, successToast: 'Standby requested.' }}>
                              <input type="hidden" name="roster_entry_id" value={entry.id} />
                              <button
                                class="btn btn-sm {getFormState(`standby:${entry.id}`) === 'success' ? 'btn-success' : getFormState(`standby:${entry.id}`) === 'error' ? 'btn-error' : 'btn-outline'}"
                                disabled={getFormState(`standby:${entry.id}`) === 'loading' || getFormState(`standby:${entry.id}`) === 'success'}
                              >
                                {#if getFormState(`standby:${entry.id}`) === 'loading'}
                                  <LoaderCircle size={16} class="animate-spin" />
                                {:else if getFormState(`standby:${entry.id}`) === 'success'}
                                  <Check size={16} />
                                {:else if getFormState(`standby:${entry.id}`) === 'error'}
                                  <X size={16} />
                                {:else}
                                  Standby
                                {/if}
                              </button>
                            </form>
                            <span class="badge badge-neutral">{(data.claims || []).filter((c) => c.roster_entry_id === entry.id && c.type === 'standby').length} standby</span>
                            {#if entry.user?.id}
                              <form method="POST" action="?/knock" use:useFormEnhance={{ key: `knock:${entry.id}`, successToast: 'Knock sent.' }}>
                                <input type="hidden" name="event_id" value={data.event.id} />
                                <input type="hidden" name="roster_entry_id" value={entry.id} />
                                <input type="hidden" name="to_user_id" value={entry.user.id} />
                                <button
                                  class="btn btn-sm {getFormState(`knock:${entry.id}`) === 'success' ? 'btn-success' : getFormState(`knock:${entry.id}`) === 'error' ? 'btn-error' : 'btn-primary'}"
                                  disabled={getFormState(`knock:${entry.id}`) === 'loading' || getFormState(`knock:${entry.id}`) === 'success'}
                                >
                                  {#if getFormState(`knock:${entry.id}`) === 'loading'}
                                    <LoaderCircle size={16} class="animate-spin" />
                                  {:else if getFormState(`knock:${entry.id}`) === 'success'}
                                    <Check size={16} />
                                  {:else if getFormState(`knock:${entry.id}`) === 'error'}
                                    <X size={16} />
                                  {:else}
                                    Knock
                                  {/if}
                                </button>
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
