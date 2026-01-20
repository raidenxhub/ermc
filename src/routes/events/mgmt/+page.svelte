<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import { Plus, Edit, Trash2, Check, X, Clock, Ban } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { eventsSyncing } from '$lib/stores/eventsSync';

	export let data: PageData;
	const { events } = data;

	let deleteStateById: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
	let cancelStateById: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
	let delayStateById: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
	let addSlotStateByEventId: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
	type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

	let addSlotDialog: HTMLDialogElement | null = null;
	let addSlotEvent: any = null;
	let addSlotAllowedAirports: string[] = [];
	let addSlotAirport = 'OBBI';
	let addSlotPosition = 'DEL';
	let addSlotStart = '';
	let addSlotEnd = '';

	let delayDialog: HTMLDialogElement | null = null;
	let delayEvent: any = null;
	let delayNewStart = '';

	const toDateTimeLocalValue = (iso: string) => {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 16);
	};

	const openAddSlot = (event: any) => {
		addSlotEvent = event;
		const airports = typeof event?.airports === 'string' ? event.airports.split(',').map((a: string) => a.trim().toUpperCase()) : [];
		addSlotAllowedAirports = airports.filter((a: string) => ['OBBI', 'OKKK'].includes(a));
		addSlotAirport = addSlotAllowedAirports[0] || 'OBBI';
		addSlotPosition = 'DEL';
		addSlotStart = toDateTimeLocalValue(event.start_time);
		addSlotEnd = toDateTimeLocalValue(event.end_time);
		addSlotDialog?.showModal();
	};

	const openDelay = (event: any) => {
		delayEvent = event;
		delayNewStart = toDateTimeLocalValue(event.start_time);
		delayDialog?.showModal();
	};

	const setDeleteState = (id: string, state: 'idle' | 'loading' | 'success' | 'error') => {
		deleteStateById = { ...deleteStateById, [id]: state };
	};

	const useEnhanceDelete = (formEl: HTMLFormElement, eventId: string) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			setDeleteState(eventId, 'loading');
			return async ({ result, update }) => {
				if (result.type === 'success') {
					setDeleteState(eventId, 'success');
					toast.success('Event deleted successfully');
					await update();
					setTimeout(() => setDeleteState(eventId, 'idle'), 2000);
					return;
				}

				await update();
				setDeleteState(eventId, 'error');
				toast.error('Failed to delete event');
				setTimeout(() => setDeleteState(eventId, 'idle'), 2000);
			};
		};
		return enhance(formEl, submit);
	};

	const setCancelState = (id: string, state: 'idle' | 'loading' | 'success' | 'error') => {
		cancelStateById = { ...cancelStateById, [id]: state };
	};

	const useEnhanceCancel = (formEl: HTMLFormElement, eventId: string) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			setCancelState(eventId, 'loading');
			return async ({ result, update }) => {
				if (result.type === 'success') {
					setCancelState(eventId, 'success');
					toast.success('Event cancelled');
					await update();
					setTimeout(() => setCancelState(eventId, 'idle'), 2000);
					return;
				}

				await update();
				setCancelState(eventId, 'error');
				toast.error('Failed to cancel event');
				setTimeout(() => setCancelState(eventId, 'idle'), 2000);
			};
		};
		return enhance(formEl, submit);
	};

	const setDelayState = (id: string, state: 'idle' | 'loading' | 'success' | 'error') => {
		delayStateById = { ...delayStateById, [id]: state };
	};

	const setAddSlotState = (id: string, state: 'idle' | 'loading' | 'success' | 'error') => {
		addSlotStateByEventId = { ...addSlotStateByEventId, [id]: state };
	};

	const useEnhanceAddSlot = (formEl: HTMLFormElement, eventId: string) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			setAddSlotState(eventId, 'loading');
			return async ({ result, update }) => {
				if (result.type === 'success') {
					setAddSlotState(eventId, 'success');
					toast.success('Slot added');
					addSlotDialog?.close();
					await update();
					setTimeout(() => setAddSlotState(eventId, 'idle'), 2000);
					return;
				}

				await update();
				setAddSlotState(eventId, 'error');
				const message = result.type === 'failure' ? ((result.data as { message?: string })?.message || 'Failed to add slot') : 'Failed to add slot';
				toast.error(message);
				setTimeout(() => setAddSlotState(eventId, 'idle'), 2000);
			};
		};
		return enhance(formEl, submit);
	};

	const useEnhanceDelay = (formEl: HTMLFormElement, eventId: string) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			setDelayState(eventId, 'loading');
			return async ({ result, update }) => {
				if (result.type === 'success') {
					setDelayState(eventId, 'success');
					toast.success('Event delayed');
					delayDialog?.close();
					await update();
					setTimeout(() => setDelayState(eventId, 'idle'), 2000);
					return;
				}

				await update();
				setDelayState(eventId, 'error');
				toast.error('Failed to delay event');
				setTimeout(() => setDelayState(eventId, 'idle'), 2000);
			};
		};
		return enhance(formEl, submit);
	};

</script>

<div class="container mx-auto px-4 py-8">
	<dialog bind:this={addSlotDialog} class="modal">
		<div class="modal-box">
			<h3 class="font-bold text-lg">Add Slot</h3>
			{#if addSlotEvent}
				<p class="text-sm text-muted-foreground mt-1">{addSlotEvent.name}</p>
			{/if}
			<form method="POST" action="?/addSlot" class="mt-6 space-y-4" use:useEnhanceAddSlot={addSlotEvent?.id || ''}>
				<input type="hidden" name="event_id" value={addSlotEvent?.id || ''} />
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="form-control">
						<label class="label" for="add_slot_airport"><span class="label-text">Airport</span></label>
						<select id="add_slot_airport" class="select select-bordered" name="airport" bind:value={addSlotAirport} disabled={!addSlotAllowedAirports.length}>
							{#each addSlotAllowedAirports as apt}
								<option value={apt}>{apt}</option>
							{/each}
						</select>
					</div>
					<div class="form-control">
						<label class="label" for="add_slot_position"><span class="label-text">Position</span></label>
						<select id="add_slot_position" class="select select-bordered" name="position" bind:value={addSlotPosition}>
							<option value="DEL">DEL</option>
							<option value="GND">GND</option>
							<option value="TWR">TWR</option>
							<option value="APP">APP</option>
							<option value="CTR">CTR</option>
						</select>
					</div>
					<div class="form-control">
						<label class="label" for="add_slot_start"><span class="label-text">Start Time</span></label>
						<input id="add_slot_start" class="input input-bordered" type="datetime-local" name="start_time" bind:value={addSlotStart} required />
					</div>
					<div class="form-control">
						<label class="label" for="add_slot_end"><span class="label-text">End Time</span></label>
						<input id="add_slot_end" class="input input-bordered" type="datetime-local" name="end_time" bind:value={addSlotEnd} required />
					</div>
				</div>
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={() => addSlotDialog?.close()}>Close</button>
					<button
						type="submit"
						class="btn ermc-state-btn {addSlotStateByEventId[addSlotEvent?.id] === 'success' ? 'ermc-success-btn' : addSlotStateByEventId[addSlotEvent?.id] === 'error' ? 'btn-error' : 'btn-primary'}"
						disabled={!addSlotEvent?.id || addSlotStateByEventId[addSlotEvent?.id] === 'loading' || addSlotStateByEventId[addSlotEvent?.id] === 'success'}
					>
						{#if addSlotStateByEventId[addSlotEvent?.id] === 'loading'}
							<span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
						{:else if addSlotStateByEventId[addSlotEvent?.id] === 'success'}
							<span class="ermc-icon-slide-in"><Check size={18} /></span>
						{:else if addSlotStateByEventId[addSlotEvent?.id] === 'error'}
							<X size={18} />
						{:else}
							Add Slot
						{/if}
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop"><button>close</button></form>
	</dialog>

	<dialog bind:this={delayDialog} class="modal">
		<div class="modal-box">
			<h3 class="font-bold text-lg">Delay Event</h3>
			{#if delayEvent}
				<p class="text-sm text-muted-foreground mt-1">{delayEvent.name}</p>
			{/if}
			<form method="POST" action="?/delayEvent" class="mt-6 space-y-4" use:useEnhanceDelay={delayEvent?.id || ''}>
				<input type="hidden" name="id" value={delayEvent?.id || ''} />
				<div class="form-control">
					<label class="label" for="delay_new_start"><span class="label-text">New start date &amp; time</span></label>
					<input id="delay_new_start" class="input input-bordered" type="datetime-local" name="new_start_time" bind:value={delayNewStart} required />
				</div>
				<div class="modal-action">
					<button type="button" class="btn btn-ghost" on:click={() => delayDialog?.close()}>Close</button>
					<button
						type="submit"
						class="btn ermc-state-btn {delayStateById[delayEvent?.id] === 'success' ? 'ermc-success-btn' : delayStateById[delayEvent?.id] === 'error' ? 'btn-error' : 'btn-primary'}"
						disabled={!delayEvent?.id || delayStateById[delayEvent?.id] === 'loading' || delayStateById[delayEvent?.id] === 'success'}
					>
						{#if delayStateById[delayEvent?.id] === 'loading'}
							<span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
						{:else if delayStateById[delayEvent?.id] === 'success'}
							<span class="ermc-icon-slide-in"><Check size={18} /></span>
						{:else if delayStateById[delayEvent?.id] === 'error'}
							<X size={18} />
						{:else}
							Delay the event
						{/if}
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop"><button>close</button></form>
	</dialog>

	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Event Management</h1>
			<p class="text-muted-foreground">Create and manage events for the network.</p>
		</div>
		<a href="/rostering/events/create" class="btn btn-primary">
			<Plus size={20} /> Create Event
		</a>
	</div>

	<div class="rounded-xl border bg-card shadow-sm overflow-hidden relative">
		{#if $eventsSyncing}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
				<span class="loader"></span>
			</div>
		{/if}
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
							<div class="flex flex-wrap items-center gap-2">
								<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
									{event.type}
								</span>
								{#if event.status === 'cancelled'}
									<span class="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
										Cancelled
									</span>
								{/if}
							</div>
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
								{#if !event.vatsim_id}
									<a href={`/events/mgmt/${event.id}/edit`} class="btn btn-ghost btn-sm btn-square" title="Edit manual event">
										<Edit size={16} />
									</a>
								{:else}
									<a href={`/rostering/events/${event.id}`} class="btn btn-ghost btn-sm btn-square" title="View roster">
										<Edit size={16} />
									</a>
								{/if}
								<button type="button" class="btn btn-ghost btn-sm btn-square" on:click={() => openAddSlot(event)} title="Add slot">
									<Plus size={16} />
								</button>
								<button
									type="button"
									class="btn ermc-state-btn btn-sm btn-square {delayStateById[event.id] === 'success' ? 'ermc-success-btn' : delayStateById[event.id] === 'error' ? 'btn-error' : 'btn-ghost'}"
									disabled={event.status === 'cancelled' || delayStateById[event.id] === 'loading' || delayStateById[event.id] === 'success'}
									title="Delay the event"
									on:click={() => openDelay(event)}
								>
									{#if delayStateById[event.id] === 'loading'}
										<span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
									{:else if delayStateById[event.id] === 'success'}
										<span class="ermc-icon-slide-in"><Check size={16} /></span>
									{:else if delayStateById[event.id] === 'error'}
										<X size={16} />
									{:else}
										<Clock size={16} />
									{/if}
								</button>
								<form
									action="?/cancelEvent"
									method="POST"
									use:useEnhanceCancel={event.id}
									on:submit={(e) => {
										if (!confirm('Cancel this event?')) {
											e.preventDefault();
											e.stopPropagation();
										}
									}}
								>
									<input type="hidden" name="id" value={event.id} />
									<button
										type="submit"
										class="btn ermc-state-btn btn-sm btn-square {cancelStateById[event.id] === 'success' ? 'ermc-success-btn' : cancelStateById[event.id] === 'error' ? 'btn-error' : 'btn-ghost'} {cancelStateById[event.id] === 'idle' ? 'text-warning hover:bg-warning/10' : ''}"
										disabled={event.status === 'cancelled' || cancelStateById[event.id] === 'loading' || cancelStateById[event.id] === 'success'}
										title="Cancel event"
									>
										{#if cancelStateById[event.id] === 'loading'}
											<span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
										{:else if cancelStateById[event.id] === 'success'}
											<span class="ermc-icon-slide-in"><Check size={16} /></span>
										{:else if cancelStateById[event.id] === 'error'}
											<X size={16} />
										{:else}
											<Ban size={16} />
										{/if}
									</button>
								</form>
								<form
									action="?/deleteEvent"
									method="POST"
									use:useEnhanceDelete={event.id}
									on:submit={(e) => {
										if (!confirm('Delete this event permanently?')) {
											e.preventDefault();
											e.stopPropagation();
										}
									}}
								>
									<input type="hidden" name="id" value={event.id} />
									<button
										type="submit"
										class="btn ermc-state-btn btn-sm btn-square {deleteStateById[event.id] === 'success' ? 'ermc-success-btn' : deleteStateById[event.id] === 'error' ? 'btn-error' : 'btn-ghost'} {deleteStateById[event.id] === 'idle' ? 'text-error hover:bg-error/10' : ''}"
										disabled={deleteStateById[event.id] === 'loading' || deleteStateById[event.id] === 'success'}
									>
										{#if deleteStateById[event.id] === 'loading'}
											<span class="loader" style="transform: scale(0.333); transform-origin: center;"></span>
										{:else if deleteStateById[event.id] === 'success'}
											<span class="ermc-icon-slide-in"><Check size={16} /></span>
										{:else if deleteStateById[event.id] === 'error'}
											<X size={16} />
										{:else}
											<Trash2 size={16} />
										{/if}
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
