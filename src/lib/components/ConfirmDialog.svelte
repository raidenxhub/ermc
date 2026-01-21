<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { confirmState, resolveConfirm } from '$lib/confirm';

	let dialog: HTMLDialogElement | null = null;
	let state: any = null;

	const unsubscribe = confirmState.subscribe((next) => {
		state = next;
		if (!dialog) return;
		try {
			if (state) {
				if (!dialog.open) dialog.showModal();
			} else if (dialog.open) {
				dialog.close();
			}
		} catch {
			return;
		}
	});

	onDestroy(() => unsubscribe());

	const close = (value: boolean) => resolveConfirm(value);

	onMount(() => {
		if (!dialog || !state) return;
		try {
			if (!dialog.open) dialog.showModal();
		} catch {
			return;
		}
	});
</script>

<dialog bind:this={dialog} class="modal">
	{#if state}
		<div class="modal-box">
			<h3 class="text-lg font-bold">{state.title}</h3>
			<p class="mt-3 whitespace-pre-line text-sm text-base-content/80">{state.message}</p>
			<div class="modal-action">
				<button type="button" class="btn" on:click={() => close(false)}>
					{state.cancelText || 'Cancel'}
				</button>
				<button type="button" class="btn btn-primary" on:click={() => close(true)}>
					{state.confirmText || 'Confirm'}
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop" on:submit|preventDefault={() => close(false)}>
			<button>close</button>
		</form>
	{/if}
</dialog>
