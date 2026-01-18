<script lang="ts">
    import type { PageData } from './$types';
    import { format, formatDistanceToNow } from 'date-fns';
    import { BarChart3, CalendarRange, Settings } from 'lucide-svelte';

    export let data: PageData;
    const { user, upcomingEvents, onlineControllers, metars } = data;
</script>

<div class="space-y-6 p-6 pb-16">
    <div class="space-y-0.5">
        <h2 class="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p class="text-muted-foreground">
            Welcome back, {user.name || 'User'} ({user.rating_short || 'Guest'}).
        </p>
    </div>

    <!-- Main Action Buttons -->
    <div class="grid gap-4 md:grid-cols-3">
        <!-- Statistics -->
        <a href="/statistics" class="group relative overflow-hidden rounded-xl border bg-card p-6 shadow transition-all hover:shadow-lg hover:border-primary/50">
            <div class="flex items-center gap-4">
                <div class="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <BarChart3 size={24} />
                </div>
                <div>
                    <h3 class="font-semibold group-hover:text-primary">My Statistics</h3>
                    <p class="text-sm text-muted-foreground">View your hours and activity</p>
                </div>
            </div>
        </a>

        <!-- Coordination -->
        <a href="/coordination" class="group relative overflow-hidden rounded-xl border bg-card p-6 shadow transition-all hover:shadow-lg hover:border-primary/50">
            <div class="flex items-center gap-4">
                <div class="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <CalendarRange size={24} />
                </div>
                <div>
                    <h3 class="font-semibold group-hover:text-primary">Coordination</h3>
                    <p class="text-sm text-muted-foreground">Book slots and view events</p>
                </div>
            </div>
        </a>

        <!-- Event Management (Staff Only) -->
        {#if user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator'}
            <a href="/events/mgmt" class="group relative overflow-hidden rounded-xl border bg-card p-6 shadow transition-all hover:shadow-lg hover:border-primary/50">
                <div class="flex items-center gap-4">
                    <div class="rounded-full bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h3 class="font-semibold group-hover:text-primary">Event Management</h3>
                        <p class="text-sm text-muted-foreground">Manage events and rosters</p>
                    </div>
                </div>
            </a>
        {/if}
    </div>

    <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-xl border bg-card text-card-foreground shadow">
            <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 class="tracking-tight text-sm font-medium">Controller Rating</h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground"><path d="M12 2v20M2 12h20" /></svg>
            </div>
            <div class="p-6 pt-0">
                <div class="flex items-center gap-2">
                    <div class="text-2xl font-bold">{user.rating_long || 'N/A'}</div>
                    <span class="badge badge-primary">{user.rating_short}</span>
                </div>
                <p class="text-xs text-muted-foreground mt-1">{user.cid || 'Not Connected'}</p>
            </div>
        </div>
        <div class="rounded-xl border bg-card text-card-foreground shadow">
            <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 class="tracking-tight text-sm font-medium">Upcoming Shifts</h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
            </div>
            <div class="p-6 pt-0">
                <div class="text-2xl font-bold">{user.rosterEntries.filter((e: { start_time: string }) => new Date(e.start_time) > new Date()).length}</div>
                <p class="text-xs text-muted-foreground">Next 7 days</p>
            </div>
        </div>
         <div class="rounded-xl border bg-card text-card-foreground shadow">
            <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 class="tracking-tight text-sm font-medium">Online Controllers</h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
            </div>
            <div class="p-6 pt-0">
                <div class="text-2xl font-bold">{onlineControllers.length}</div>
                <p class="text-xs text-muted-foreground">Online in region</p>
            </div>
        </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div class="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
            <div class="flex flex-col space-y-1.5 p-6">
                <h3 class="font-semibold leading-none tracking-tight">Your Roster</h3>
                <p class="text-sm text-muted-foreground">Upcoming shifts you have claimed.</p>
            </div>
            <div class="p-6 pt-0">
                <div class="space-y-8">
                    {#if user.rosterEntries.length === 0}
                        <p class="text-sm text-muted-foreground">No upcoming shifts found.</p>
                    {:else}
                        {#each user.rosterEntries as entry}
                            <div class="flex items-center">
                                <div class="ml-4 space-y-1">
                                    <p class="text-sm font-medium leading-none">{entry.position} @ {entry.airport}</p>
                                    <p class="text-sm text-muted-foreground">
                                        {format(new Date(entry.start_time), 'MMM d, HH:mm')} - {format(new Date(entry.end_time), 'HH:mm')} z
                                    </p>
                                </div>
                                <div class="ml-auto font-medium">
                                    <a href="/coordination/events/{entry.event_id}" class="text-blue-500 hover:underline text-sm">View Event</a>
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        </div>

        <div class="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
             <div class="flex flex-col space-y-1.5 p-6">
                <h3 class="font-semibold leading-none tracking-tight">Upcoming Events</h3>
                <p class="text-sm text-muted-foreground">Next 5 events on the network.</p>
            </div>
            <div class="p-6 pt-0">
                 <div class="space-y-8">
                    {#each upcomingEvents as event}
                        <div class="flex items-center">
                            <div class="ml-4 space-y-1">
                                <p class="text-sm font-medium leading-none">{event.name}</p>
                                <p class="text-sm text-muted-foreground">
                                     {format(new Date(event.start_time), 'MMM d, HH:mm')} z
                                </p>
                            </div>
                            <div class="ml-auto font-medium">
                                <a href="/rostering/events/{event.id}" class="btn btn-sm btn-primary">Book Now</a>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>

    <!-- Live Network Status Section -->
    <div class="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <!-- Online Controllers -->
        <div class="rounded-xl border bg-card text-card-foreground shadow">
            <div class="flex flex-col space-y-1.5 p-6">
                <h3 class="font-semibold leading-none tracking-tight">Online Controllers</h3>
                <p class="text-sm text-muted-foreground">Active ATC in the region.</p>
            </div>
            <div class="p-6 pt-0">
                <div class="relative w-full overflow-auto">
                    <table class="w-full caption-bottom text-sm">
                        <thead class="[&_tr]:border-b">
                            <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Callsign</th>
                                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Frequency</th>
                                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Online For</th>
                            </tr>
                        </thead>
                        <tbody class="[&_tr:last-child]:border-0">
                            {#if onlineControllers.length === 0}
                                <tr>
                                    <td colspan="4" class="p-4 text-center text-muted-foreground">No controllers online.</td>
                                </tr>
                            {:else}
                                {#each onlineControllers as controller}
                                    <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td class="p-4 align-middle font-medium">{controller.callsign}</td>
                                        <td class="p-4 align-middle">{controller.frequency}</td>
                                        <td class="p-4 align-middle">{controller.name}</td>
                                        <td class="p-4 align-middle">{formatDistanceToNow(new Date(controller.logonTime))}</td>
                                    </tr>
                                {/each}
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Weather / METAR -->
        <div class="rounded-xl border bg-card text-card-foreground shadow">
            <div class="flex flex-col space-y-1.5 p-6">
                <h3 class="font-semibold leading-none tracking-tight">Live Weather (METAR)</h3>
                <p class="text-sm text-muted-foreground">Latest reports for major airports.</p>
            </div>
            <div class="p-6 pt-0 max-h-[400px] overflow-y-auto space-y-4">
                {#if Object.keys(metars).length === 0}
                    <p class="text-sm text-muted-foreground">No weather data available.</p>
                {:else}
                    {#each Object.entries(metars) as [icao, metar]}
                        <div class="rounded-lg border p-3">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-bold text-sm">{icao}</span>
                                <span class="text-xs text-muted-foreground">VATSIM METAR</span>
                            </div>
                            <p class="font-mono text-xs break-all">{metar}</p>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>
