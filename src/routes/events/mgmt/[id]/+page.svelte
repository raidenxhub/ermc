<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Check, X } from 'lucide-svelte';
	import { eventsSyncing } from '$lib/stores/eventsSync';

	export let data: PageData;

	type SubmitState = 'idle' | 'loading' | 'success' | 'error';
	let deleteState: SubmitState = 'idle';
	let cancelState: SubmitState = 'idle';

	type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

	const useEnhanceDelete = (formEl: HTMLFormElement) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			deleteState = 'loading';
			return async ({ result, update }) => {
				if (result.type === 'success') {
					deleteState = 'success';
					toast.success('Event deleted');
					await update();
					return;
				}
				await update();
				deleteState = 'error';
				toast.error('Failed to delete event');
				setTimeout(() => (deleteState = 'idle'), 2000);
			};
		};
		return enhance(formEl, submit);
	};

	const useEnhanceCancel = (formEl: HTMLFormElement) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			cancelState = 'loading';
			return async ({ result, update }) => {
				if (result.type === 'success') {
					cancelState = 'success';
					toast.success('Event cancelled');
					await update();
					setTimeout(() => (cancelState = 'idle'), 2000);
					return;
				}
				await update();
				cancelState = 'error';
				toast.error('Failed to cancel event');
				setTimeout(() => (cancelState = 'idle'), 2000);
			};
		};
		return enhance(formEl, submit);
	};
</script>

<div class="container mx-auto px-4 py-8 max-w-3xl space-y-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">Manage Event</h1>
			<p class="text-muted-foreground">{data.event.name}</p>
		</div>
		<a class="btn btn-ghost" href="/events/mgmt">Back</a>
	</div>

	{#if $eventsSyncing}
		<div class="rounded-xl border bg-card p-6 flex items-center justify-center">
			<span class="loader"></span>
		</div>
	{/if}

	<div class="rounded-xl border bg-card p-6 space-y-3">
		<div class="text-sm text-muted-foreground">Start</div>
		<div class="font-medium">{new Date(data.event.start_time).toUTCString()}</div>
		<div class="text-sm text-muted-foreground mt-3">End</div>
		<div class="font-medium">{new Date(data.event.end_time).toUTCString()}</div>
		{#if data.event.airports}
			<div class="text-sm text-muted-foreground mt-3">Airports</div>
			<div class="font-medium">{data.event.airports}</div>
		{/if}
	</div>

	<div class="flex flex-wrap gap-3">
		{#if !data.event.vatsim_id}
			<a class="btn btn-primary" href={`/events/mgmt/${data.event.id}/edit`}>Edit manual event</a>
		{:else}
			<a class="btn btn-primary" href={`/rostering/events/${data.event.id}`}>View roster</a>
		{/if}

		<form
			method="POST"
			action="?/cancelEvent"
			use:useEnhanceCancel
			on:submit={(e) => {
				if (!confirm('Cancel this event?')) {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
		>
			<input type="hidden" name="id" value={data.event.id} />
			<button class="btn ermc-state-btn {cancelState === 'success' ? 'ermc-success-btn' : cancelState === 'error' ? 'btn-error' : 'btn-ghost'}" disabled={cancelState === 'loading' || cancelState === 'success'}>
				{#if cancelState === 'loading'}
					<span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
				{:else if cancelState === 'success'}
					<span class="ermc-icon-slide-in"><Check size={18} /></span>
				{:else if cancelState === 'error'}
					<X size={18} />
				{:else}
					Cancel
				{/if}
			</button>
		</form>

		<form
			method="POST"
			action="?/deleteEvent"
			use:useEnhanceDelete
			on:submit={(e) => {
				if (!confirm('Delete this event permanently?')) {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
		>
			<input type="hidden" name="id" value={data.event.id} />
			<button class="btn ermc-state-btn {deleteState === 'success' ? 'ermc-success-btn' : deleteState === 'error' ? 'btn-error' : 'btn-ghost'} text-error hover:bg-error/10" disabled={deleteState === 'loading' || deleteState === 'success'}>
				{#if deleteState === 'loading'}
					<span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
				{:else if deleteState === 'success'}
					<span class="ermc-icon-slide-in"><Check size={18} /></span>
				{:else if deleteState === 'error'}
					<X size={18} />
				{:else}
					Delete
				{/if}
			</button>
		</form>
	</div>
</div>

