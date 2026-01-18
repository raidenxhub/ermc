<script lang="ts">
    import type { PageData } from './$types';
    
    export let data: PageData;
</script>

<div class="container mx-auto px-4 py-8">
    <div class="mb-8 space-y-2">
        <h1 class="text-3xl font-bold">Live Coordination</h1>
        <p class="text-muted-foreground">Real-time coordination for active events. Only available during event times for booked controllers.</p>
    </div>

    <div class="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p class="text-muted-foreground">No active events found or you do not have a booking for a current event.</p>
    </div>
</div>
