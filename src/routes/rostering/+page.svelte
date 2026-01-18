<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
    
    export let data: PageData;
</script>

<div class="container mx-auto px-4 py-8">
    <div class="mb-8 space-y-2">
        <h1 class="text-3xl font-bold">Event Rostering</h1>
        <p class="text-muted-foreground">Browse upcoming events, book your slots, and manage your roster entries.</p>
    </div>

    <div class="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p class="text-muted-foreground">No active events found.</p>
    </div>
</div>
