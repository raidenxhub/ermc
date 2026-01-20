<script lang="ts">
	import type { VatsimEvent } from '$lib/types';

	import { CalendarCheck2 } from 'lucide-svelte';

	let { events }: { events: VatsimEvent[] } = $props();

	const cleanText = (value: string) =>
		value
			.replace(/:[a-z0-9_+-]+:/gi, '')
			.replace(/(\*\*|__|\*|_|`)/g, '')
			.replace(/\s+/g, ' ')
			.trim();
</script>

<div class="flex w-full flex-col items-center gap-10">
	{#each events as event}
		<div class="card w-[80vw] bg-base-100 shadow-xl 2xl:card-side 2xl:w-[60vw]">
			<figure class="h-auto w-full 2xl:w-2/5">
				<img src={event.banner} alt="Event Banner" class="h-full w-full object-fill" />
			</figure>

			<div class="card-body relative w-full justify-between gap-10 rounded-xl bg-opacity-80 shadow-xl 2xl:w-3/5">
				<!-- Decorative Overlay -->
				<div
					class="absolute inset-0 rounded-b-xl bg-gradient-to-br from-white to-secondary opacity-50 shadow-inner 2xl:rounded-b-none 2xl:rounded-r-xl"
				></div>

				<div class="relative flex flex-col gap-1">
					<h2 class="card-title text-base lg:text-xl">{event.name}<span class="badge badge-neutral text-xs">{event.type}</span></h2>
					<p class="text-sm sm:text-base">{cleanText(event.short_description || event.description || '')}</p>
				</div>

				<div class="card-actions relative items-center justify-between">
					<div class="flex items-center gap-1">
						<CalendarCheck2 size={20} />

						<p class="text-sm font-bold sm:text-base">
							{new Date(event.start_time)
								.toLocaleDateString('en-GB', {
									weekday: 'long',
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})
								.replace(/(\w+) (\d+) (\w+) (\d+)/, '$1, $2 $3, $4')}
						</p>
					</div>

					<a href={event.link} target="_blank" class="btn btn-secondary">View Info</a>
				</div>
			</div>
		</div>
	{/each}
</div>
