<script lang="ts">
  import { enhance } from '$app/forms';
  import { CalendarPlus } from 'lucide-svelte';
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
  <div class="flex items-center gap-4 mb-8">
    <div class="p-3 bg-primary/10 rounded-full text-primary">
      <CalendarPlus size={32} />
    </div>
    <div>
      <h1 class="text-3xl font-bold">Create Event (ERMC)</h1>
      <p class="text-muted-foreground">Staff/coordinators can add events manually.</p>
    </div>
  </div>

  <form method="POST" use:enhance class="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
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

    <button type="submit" class="btn btn-primary">Create Event</button>
  </form>
</div>
