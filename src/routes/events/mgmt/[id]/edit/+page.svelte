<script lang="ts">
	import type { PageData } from './$types';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Check, X, PencilLine } from 'lucide-svelte';

	export let data: PageData;

	let submitState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

	const toDateTimeLocalValue = (iso: string) => {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '';
		const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 16);
	};

	let startLocal = toDateTimeLocalValue(data.event.start_time);
	let endLocal = toDateTimeLocalValue(data.event.end_time);

	const useEnhanceEdit = (formEl: HTMLFormElement) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			submitState = 'loading';
			return async ({ result, update }) => {
				if (result.type === 'redirect') {
					submitState = 'success';
					toast.success('Event updated.');
					const location = (result as { location: string }).location;
					await new Promise((r) => setTimeout(r, 1200));
					await goto(location);
					return;
				}

				await update();

				if (result.type === 'failure') {
					submitState = 'error';
					const message = (result.data as { message?: string })?.message || 'Failed to update event.';
					toast.error(message);
					setTimeout(() => (submitState = 'idle'), 2000);
					return;
				}

				submitState = 'idle';
			};
		};
		return enhance(formEl, submit);
	};
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
	<div class="flex items-center gap-4 mb-8">
		<div class="p-3 bg-primary/10 rounded-full text-primary">
			<PencilLine size={32} />
		</div>
		<div>
			<h1 class="text-3xl font-bold">Edit Manual Event</h1>
			<p class="text-muted-foreground">{data.event.name}</p>
		</div>
	</div>

	<form method="POST" use:useEnhanceEdit class="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
		<div>
			<label for="name" class="label text-sm font-medium">Event Name</label>
			<input id="name" name="name" type="text" required class="input input-bordered w-full" value={data.event.name} />
		</div>
		<div>
			<label for="type" class="label text-sm font-medium">Event Type</label>
			<input id="type" name="type" type="text" class="input input-bordered w-full" value={data.event.type || ''} />
		</div>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label for="start_time" class="label text-sm font-medium">Start Time (UTC)</label>
				<input id="start_time" name="start_time" type="datetime-local" required class="input input-bordered w-full" bind:value={startLocal} />
			</div>
			<div>
				<label for="end_time" class="label text-sm font-medium">End Time (UTC)</label>
				<input id="end_time" name="end_time" type="datetime-local" required class="input input-bordered w-full" bind:value={endLocal} />
			</div>
		</div>
		<div>
			<label for="airports" class="label text-sm font-medium">Airports (comma-separated ICAO)</label>
			<input id="airports" name="airports" type="text" class="input input-bordered w-full" value={data.event.airports || ''} />
		</div>
		<div>
			<label for="link" class="label text-sm font-medium">External Link</label>
			<input id="link" name="link" type="url" class="input input-bordered w-full" value={data.event.link || ''} />
		</div>
		<div>
			<label for="banner" class="label text-sm font-medium">Banner URL</label>
			<input id="banner" name="banner" type="url" class="input input-bordered w-full" value={data.event.banner || ''} />
		</div>
		<div>
			<label for="description" class="label text-sm font-medium">Description</label>
			<textarea id="description" name="description" class="textarea textarea-bordered w-full" rows="6">{data.event.description || ''}</textarea>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="submit"
				class="btn ermc-state-btn {submitState === 'success' ? 'ermc-success-btn' : submitState === 'error' ? 'btn-error' : 'btn-primary'}"
				disabled={submitState === 'loading' || submitState === 'success'}
			>
				{#if submitState === 'loading'}
					<span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
				{:else if submitState === 'success'}
					<span class="ermc-icon-slide-in"><Check size={18} /></span>
				{:else if submitState === 'error'}
					<X size={18} />
				{:else}
					Save Changes
				{/if}
			</button>
			<a class="btn btn-ghost" href={`/events/mgmt/${data.event.id}`}>Cancel</a>
		</div>
	</form>
</div>

