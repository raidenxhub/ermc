<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { Clock, Trophy, History } from 'lucide-svelte';

	export let data: PageData;
	const { history, stats } = data;
</script>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-8 text-3xl font-bold">My Statistics</h1>

	<div class="grid gap-6 md:grid-cols-2">
		<div class="rounded-xl border bg-card p-6 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="rounded-full bg-blue-100 p-4 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
					<Clock size={32} />
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Hours</p>
					<h2 class="text-4xl font-bold">{stats.totalHours}</h2>
				</div>
			</div>
		</div>

		<div class="rounded-xl border bg-card p-6 shadow-sm">
			<div class="flex items-center gap-4">
				<div class="rounded-full bg-yellow-100 p-4 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
					<Trophy size={32} />
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Events Attended</p>
					<h2 class="text-4xl font-bold">{stats.totalEvents}</h2>
				</div>
			</div>
		</div>
	</div>

	<div class="mt-12">
		<div class="mb-4 flex items-center gap-2">
			<History size={20} />
			<h2 class="text-xl font-bold">History</h2>
		</div>

		<div class="rounded-xl border bg-card shadow-sm overflow-hidden">
			<table class="w-full text-left text-sm">
				<thead class="bg-muted/50 text-muted-foreground">
					<tr>
						<th class="p-4 font-medium">Date</th>
						<th class="p-4 font-medium">Event</th>
						<th class="p-4 font-medium">Position</th>
						<th class="p-4 font-medium">Duration</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each history as entry}
						<tr class="hover:bg-muted/20">
							<td class="p-4">{format(new Date(entry.start_time), 'MMM d, yyyy')}</td>
							<td class="p-4 font-medium">{entry.event?.name || 'Unknown Event'}</td>
							<td class="p-4 font-mono">{entry.position}</td>
							<td class="p-4">
								{((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)).toFixed(1)} hrs
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if history.length === 0}
				<div class="p-8 text-center text-muted-foreground">No history found.</div>
			{/if}
		</div>
	</div>
</div>
