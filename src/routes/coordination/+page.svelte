<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { Plane, Calendar, Clock, MapPin, User, AlertCircle } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export let data: PageData;
	const { events, user, userProfile } = data;
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 space-y-2">
		<h1 class="text-3xl font-bold">Coordination</h1>
		<p class="text-muted-foreground">Browse upcoming events and book your ATC slots.</p>
	</div>

	{#if events.length === 0}
		<div class="rounded-xl border bg-card p-8 text-center shadow-sm">
			<p class="text-muted-foreground">No upcoming events found.</p>
		</div>
	{:else}
		<div class="space-y-8">
			{#each events as event}
				<div class="overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
					<!-- Event Header -->
					<div class="relative h-48 w-full bg-muted">
						{#if event.banner}
							<img src={event.banner} alt={event.name} class="h-full w-full object-cover" />
						{:else}
							<div class="flex h-full items-center justify-center bg-base-200">
								<Plane size={48} class="text-base-content/20" />
							</div>
						{/if}
						<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
							<h2 class="text-2xl font-bold">{event.name}</h2>
							<div class="mt-2 flex items-center gap-4 text-sm font-medium opacity-90">
								<div class="flex items-center gap-1">
									<Calendar size={16} />
									{format(new Date(event.start_time), 'MMM d, yyyy')}
								</div>
								<div class="flex items-center gap-1">
									<Clock size={16} />
									{format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')} z
								</div>
							</div>
						</div>
					</div>

					<!-- Event Body -->
					<div class="p-6">
						<p class="mb-6 text-sm text-muted-foreground">{event.description || 'No description provided.'}</p>

						<!-- Roster Slots -->
						<div class="rounded-lg border bg-base-100">
							<div class="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
								<h3 class="font-semibold text-sm">Available Positions</h3>
                                <span class="text-xs text-muted-foreground">{event.roster_entries?.filter(e => !e.user_id).length || 0} slots open</span>
							</div>
							<div class="divide-y max-h-96 overflow-y-auto">
								{#if event.roster_entries && event.roster_entries.length > 0}
									{#each event.roster_entries as slot}
										<div class="flex items-center justify-between p-4 hover:bg-base-200/50 transition-colors">
											<div class="flex items-center gap-4">
												<div class="rounded-md bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary w-20 text-center">
													{slot.position}
												</div>
												<div class="flex items-center gap-1 text-sm text-muted-foreground w-20">
													<MapPin size={14} />
													{slot.airport}
												</div>
                                                <div class="text-xs text-muted-foreground hidden md:block">
                                                    {format(new Date(slot.start_time), 'HH:mm')} - {format(new Date(slot.end_time), 'HH:mm')}
                                                </div>
												{#if slot.user_id}
													<div class="flex items-center gap-1 text-sm font-medium ml-4 {slot.user_id === user.id ? 'text-green-600' : 'text-muted-foreground'}">
														<User size={14} />
														{slot.user_id === user.id ? 'Booked by You' : 'Booked'}
													</div>
												{/if}
											</div>

											<div>
												{#if user && slot.user_id === user.id}
													<form 
                                                        action="?/cancelSlot" 
                                                        method="POST" 
                                                        use:enhance={() => {
                                                            return async ({ result }) => {
                                                                if (result.type === 'success') {
                                                                    toast.success('Slot booking cancelled.');
                                                                } else {
                                                                    toast.error('Failed to cancel slot.');
                                                                }
                                                            }
                                                        }}
                                                    >
														<input type="hidden" name="entry_id" value={slot.id} />
														<button type="submit" class="btn btn-error btn-sm btn-outline">Cancel</button>
													</form>
												{:else if !slot.user_id}
													<form 
                                                        action="?/bookSlot" 
                                                        method="POST" 
                                                        use:enhance={() => {
                                                            return async ({ result }) => {
                                                                if (result.type === 'success') {
                                                                    toast.success('Slot booked successfully!');
                                                                } else if (result.type === 'failure') {
                                                                    toast.error(result.data?.message || 'Failed to book slot.');
                                                                }
                                                            }
                                                        }}
                                                    >
														<input type="hidden" name="entry_id" value={slot.id} />
														<button type="submit" class="btn btn-primary btn-sm">Book</button>
													</form>
												{:else}
													<button disabled class="btn btn-ghost btn-sm disabled:bg-transparent text-muted-foreground">Taken</button>
												{/if}
											</div>
										</div>
									{/each}
								{:else}
									<div class="p-8 text-center flex flex-col items-center gap-2 text-muted-foreground">
                                        <AlertCircle size={24} />
                                        <span>No roster slots available for this event yet.</span>
                                    </div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
