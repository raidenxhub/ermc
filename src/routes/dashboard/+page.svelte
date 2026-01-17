<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageData } from './$types';
    import { format, formatDistanceToNow } from 'date-fns';

    export let data: PageData;
    const { user, upcomingEvents, profileComplete, onlineControllers, metars } = data;
</script>

<div class="space-y-6 p-6 pb-16">
    <div class="space-y-0.5">
        <h2 class="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p class="text-muted-foreground">
            Welcome back, {user.name || 'User'} ({user.rating_short || 'Guest'}).
        </p>
    </div>

    {#if !profileComplete}
        <div class="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
            <div class="flex items-start gap-4">
                <div class="p-2 bg-yellow-100 rounded-full dark:bg-yellow-900">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-600 dark:text-yellow-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div class="flex-1">
                    <h3 class="font-semibold text-yellow-900 dark:text-yellow-200">Complete Your Profile</h3>
                    <p class="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                        To claim roster slots, we need your VATSIM CID and Rating. Please verify your details below.
                    </p>
                    
                    <form action="?/updateProfile" method="POST" use:enhance class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
                        <div class="grid gap-2">
                            <label for="cid" class="text-sm font-medium">VATSIM CID</label>
                            <input type="text" name="cid" id="cid" value={user.cid || ''} placeholder="1000000" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required />
                        </div>
                        <div class="grid gap-2">
                            <label for="rating" class="text-sm font-medium">Controller Rating</label>
                            <select name="rating" id="rating" value={user.rating || ''} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                                <option value="" disabled selected>Select Rating</option>
                                <option value="1">Observer (OBS)</option>
                                <option value="2">Student 1 (S1)</option>
                                <option value="3">Student 2 (S2)</option>
                                <option value="4">Senior Student (S3)</option>
                                <option value="5">Controller 1 (C1)</option>
                                <option value="7">Controller 3 (C3)</option>
                                <option value="8">Instructor 1 (I1)</option>
                                <option value="10">Instructor 3 (I3)</option>
                                <option value="11">Supervisor (SUP)</option>
                                <option value="12">Administrator (ADM)</option>
                            </select>
                        </div>
                        <button type="submit" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                            Update Profile
                        </button>
                    </form>
                </div>
            </div>
        </div>
    {/if}

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border bg-card text-card-foreground shadow">
            <div class="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 class="tracking-tight text-sm font-medium">Controller Rating</h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" class="h-4 w-4 text-muted-foreground"><path d="M12 2v20M2 12h20" /></svg>
            </div>
            <div class="p-6 pt-0">
                <div class="text-2xl font-bold">{user.rating_long || 'N/A'}</div>
                <p class="text-xs text-muted-foreground">{user.cid || 'Not Connected'}</p>
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
                                <a href="/coordination/events/{event.id}" class="text-blue-500 hover:underline text-sm">View</a>
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
