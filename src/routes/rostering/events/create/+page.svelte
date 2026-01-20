<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { CalendarPlus, Check, X, LoaderCircle } from 'lucide-svelte';
  export let form;

  let submitState: 'idle' | 'loading' | 'success' | 'error' = 'idle';

  const enhanceCreate = enhance(() => {
    submitState = 'loading';
    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        submitState = 'success';
        toast.success('Event created successfully.');
        const location = (result as { location: string }).location;
        await new Promise((r) => setTimeout(r, 2000));
        await goto(location);
        return;
      }

      await update();

      if (result.type === 'failure') {
        submitState = 'error';
        const message = (result.data as { message?: string })?.message || 'Failed to create event.';
        toast.error(message);
        setTimeout(() => (submitState = 'idle'), 2000);
        return;
      }

      submitState = 'idle';
    };
  });
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
  <div class="flex items-center gap-4 mb-8">
    <div class="p-3 bg-primary/10 rounded-full text-primary">
      <CalendarPlus size={32} />
    </div>
    <div>
      <h1 class="text-3xl font-bold">Create Event</h1>
      <h3 class="text-3xl font-bold">Khaleej vACC</h3>
      <p class="text-muted-foreground">Staff/coordinators can add events manually.</p>
    </div>
  </div>

    {#if form?.message}
        <div role="alert" class="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{form.message}</span>
        </div>
    {/if}

  <form method="POST" use:enhanceCreate class="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
    <div>
      <label for="name" class="label text-sm font-medium">Event Name</label>
      <input id="name" name="name" type="text" required class="input input-bordered w-full" placeholder="e.g. ERMC Shuttle" />
    </div>
    <div>
      <label for="type" class="label text-sm font-medium">Event Type</label>
      <input id="type" name="type" type="text" class="input input-bordered w-full" placeholder="e.g. Fly-in, Shuttle" />
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="start_time" class="label text-sm font-medium">Start Time (UTC)</label>
        <input id="start_time" name="start_time" type="datetime-local" required class="input input-bordered w-full" />
      </div>
      <div>
        <label for="end_time" class="label text-sm font-medium">End Time (UTC)</label>
        <input id="end_time" name="end_time" type="datetime-local" required class="input input-bordered w-full" />
      </div>
    </div>
    <div>
      <label for="airports" class="label text-sm font-medium">Airports (comma-separated ICAO)</label>
      <input id="airports" name="airports" type="text" class="input input-bordered w-full" placeholder="OBBI, OKKK" />
    </div>
    <div>
      <label for="link" class="label text-sm font-medium">External Link</label>
      <input id="link" name="link" type="url" class="input input-bordered w-full" placeholder="https://..." />
    </div>
    <div>
      <label for="banner" class="label text-sm font-medium">Banner URL</label>
      <input id="banner" name="banner" type="url" class="input input-bordered w-full" placeholder="https://.../banner.png" />
    </div>
    <div>
      <label for="description" class="label text-sm font-medium">Description</label>
      <textarea id="description" name="description" class="textarea textarea-bordered w-full" rows="4"></textarea>
    </div>

    <button
      type="submit"
      class="btn {submitState === 'success' ? 'btn-success' : submitState === 'error' ? 'btn-error' : 'btn-primary'}"
      disabled={submitState === 'loading' || submitState === 'success'}
    >
      {#if submitState === 'loading'}
        <LoaderCircle size={18} class="animate-spin" />
        Creating...
      {:else if submitState === 'success'}
        <Check size={18} />
        Created
      {:else if submitState === 'error'}
        <X size={18} />
        Failed
      {:else}
        Create Event
      {/if}
    </button>
  </form>
</div>
