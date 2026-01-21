<script lang="ts">
    import type { PageData } from './$types';
    import { format } from 'date-fns';
    import { CalendarRange, MapPin, Clock, Check } from 'lucide-svelte';
    import { eventsSyncing } from '$lib/stores/eventsSync';
    import { goto } from '$app/navigation';
    
    export let data: PageData;
    // Assuming data.events is passed from +page.server.ts
    const events = data.events || [];
    const bookedEventIds = new Set<string>(Array.isArray((data as any).bookedEventIds) ? ((data as any).bookedEventIds as string[]) : []);

    function getClosingStatus(endTime: string) {
        const end = new Date(endTime).getTime();
        const now = Date.now();
        const diff = end - now;
        
        if (diff < 0) return 'Ended';
        if (diff < 30 * 60 * 1000) return `Closing in ${Math.ceil(diff / 60000)}m`;
        return null;
    }

    function getDeleteCountdown(deleteAt?: string | null) {
        if (!deleteAt) return null;
        const ms = new Date(deleteAt).getTime() - Date.now();
        if (!Number.isFinite(ms)) return null;
        if (ms <= 0) return 'Deleting...';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    function cleanText(value: string) {
        return value
            .replace(/:[a-z0-9_+-]+:/gi, '')
            .replace(/(\*\*|__|\*|_|`)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    let navToEventId: string | null = null;
    const navToEvent = async (e: Event, eventId: string) => {
        e.preventDefault();
        if (navToEventId) return;
        navToEventId = eventId;
        await goto(`/rostering/events/${eventId}`);
        navToEventId = null;
    };
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
        <div class="relative">
            {#if $eventsSyncing}
                <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
                    <span class="loader"></span>
                </div>
            {/if}
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each events as event}
                {@const closingStatus = getClosingStatus(event.end_time)}
                {@const deleteCountdown = event.status === 'cancelled' ? getDeleteCountdown(event.delete_at) : null}
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
                            {#if event.status === 'cancelled'}
                                <div class="absolute top-2 left-2 badge badge-error gap-1 font-bold shadow-md">
                                    Cancelled{#if deleteCountdown} • {deleteCountdown}{/if}
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
                            {#if event.status === 'cancelled'}
                                <div class="absolute top-4 left-4 badge badge-error gap-1 font-bold">
                                    Cancelled{#if deleteCountdown} • {deleteCountdown}{/if}
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

                        <p class="text-sm line-clamp-4 text-muted-foreground">
                            {event.short_description ? cleanText(event.short_description) : event.description ? cleanText(event.description) : 'No description available.'}
                        </p>
                    </div>

                    <div class="p-6 pt-0 mt-auto">
                        <a
                            href="/rostering/events/{event.id}"
                            class="btn {bookedEventIds.has(event.id) ? 'ermc-state-btn ermc-success-btn' : 'btn-primary'} w-full group-hover:btn-active {event.status === 'cancelled' ? 'btn-disabled' : ''}"
                            aria-disabled={event.status === 'cancelled'}
                            on:click={(e) => navToEvent(e, event.id)}
                        >
                            {#if event.status === 'cancelled'}
                                Event Cancelled
                            {:else if navToEventId === event.id}
                                <span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
                            {:else if bookedEventIds.has(event.id)}
                                <span class="inline-flex items-center gap-2"><Check size={18} /> Booked</span>
                            {:else}
                                View Roster
                            {/if}
                        </a>
                    </div>
                </div>
            {/each}
            </div>
        </div>
    {/if}
</div>
