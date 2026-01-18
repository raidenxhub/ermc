<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { Plus, Edit, Trash2, Calendar } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export let data: PageData;
	const { events } = data;
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Event Management</h1>
			<p class="text-muted-foreground">Create and manage events for the network.</p>
		</div>
		<a href="/coordination/events/create" class="btn btn-primary">
			<Plus size={20} /> Create Event
		</a>
	</div>

	<div class="rounded-xl border bg-card shadow-sm overflow-hidden">
		<table class="w-full text-left text-sm">
			<thead class="bg-muted/50 text-muted-foreground">
				<tr>
					<th class="p-4 font-medium">Event Name</th>
					<th class="p-4 font-medium">Type</th>
					<th class="p-4 font-medium">Date/Time</th>
					<th class="p-4 font-medium">Airports</th>
					<th class="p-4 font-medium text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y">
				{#each events as event}
					<tr class="hover:bg-muted/20">
						<td class="p-4 font-medium">{event.name}</td>
						<td class="p-4">
							<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
								{event.type}
							</span>
						</td>
						<td class="p-4">
							<div class="flex flex-col">
								<span>{format(new Date(event.start_time), 'MMM d, yyyy')}</span>
								<span class="text-xs text-muted-foreground">{format(new Date(event.start_time), 'HH:mm')} z</span>
							</div>
						</td>
						<td class="p-4">{event.airports || 'N/A'}</td>
						<td class="p-4 text-right">
							<div class="flex justify-end gap-2">
								<a href="/coordination/events/{event.id}" class="btn btn-ghost btn-sm btn-square">
									<Edit size={16} />
								</a>
								<form 
									action="?/deleteEvent" 
									method="POST" 
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												toast.success('Event deleted successfully');
											} else {
												toast.error('Failed to delete event');
											}
										};
									}}
								>
									<input type="hidden" name="id" value={event.id} />
									<button type="submit" class="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10">
										<Trash2 size={16} />
									</button>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if events.length === 0}
			<div class="p-8 text-center text-muted-foreground">No events found.</div>
		{/if}
	</div>
</div>
