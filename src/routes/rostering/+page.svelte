    import type { PageData } from './$types';
    import { format, formatDistanceToNow } from 'date-fns';
    import { CalendarRange, MapPin, Clock } from 'lucide-svelte';
    
    export let data: PageData;
    // Assuming data.events is passed from +page.server.ts
    const events = data.events || [];

    function getClosingStatus(endTime: string) {
        const end = new Date(endTime).getTime();
        const now = Date.now();
        const diff = end - now;
        
        if (diff < 0) return 'Ended';
        if (diff < 30 * 60 * 1000) return `Closing in ${Math.ceil(diff / 60000)}m`;
        return null;
    }
</script>

<div class="container mx-auto px-4 py-8">
    <div class="mb-8 space-y-2">
        <h1 class="text-3xl font-bold">Event Rostering</h1>
        <p class="text-muted-foreground">Browse upcoming events, book your slots, and manage your roster entries.</p>
    </div>

    {#if events.length === 0}
        <div class="rounded-xl border bg-card p-12 text-center shadow-sm flex flex-col items-center gap-4">
            <div class="p-4 bg-muted/50 rounded-full">
                <CalendarRange size={48} class="text-muted-foreground" />
            </div>
            <div class="space-y-1">
                <h3 class="font-semibold text-lg">No Active Events</h3>
                <p class="text-muted-foreground">There are no upcoming events scheduled at this time. Check back later!</p>
            </div>
        </div>
    {:else}
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each events as event}
                {@const closingStatus = getClosingStatus(event.end_time)}
                <div class="group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md hover:border-primary/50">
                    {#if event.banner}
                        <div class="aspect-video w-full overflow-hidden rounded-t-xl bg-muted relative">
                            <img src={event.banner} alt={event.name} class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            <div class="absolute bottom-4 left-4 right-4">
                                <h3 class="font-bold text-white text-lg leading-tight">{event.name}</h3>
                            </div>
                            {#if closingStatus}
                                <div class="absolute top-2 right-2 badge badge-warning gap-1 font-bold shadow-md">
                                    <Clock size={12} /> {closingStatus}
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <div class="p-6 pb-2 relative">
                             <h3 class="font-bold text-xl leading-tight">{event.name}</h3>
                             {#if closingStatus}
                                <div class="absolute top-4 right-4 badge badge-warning gap-1 font-bold">
                                    <Clock size={12} /> {closingStatus}
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <div class="flex-1 p-6 pt-4 space-y-4">
                        <div class="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarRange size={16} />
                            <span>{format(new Date(event.start_time), 'MMM d, yyyy • HH:mm')} z</span>
                        </div>
                        
                        {#if event.airports}
                            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin size={16} />
                                <span>{event.airports.split(',').join(', ')}</span>
                            </div>
                        {/if}

                        <p class="text-sm line-clamp-2 text-muted-foreground">
                            {event.description || 'No description available.'}
                        </p>
                    </div>

                    <div class="p-6 pt-0 mt-auto">
                        <a href="/rostering/events/{event.id}" class="btn btn-primary w-full group-hover:btn-active">
                            View Roster
                        </a>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
