<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { confirmState, resolveConfirm } from '$lib/confirm';
	import { Check } from 'lucide-svelte';

	let state: any = null;
	let removeKeyListener: (() => void) | null = null;
	let confirmBtnState: 'idle' | 'loading' | 'success' = 'idle';
	let cancelBtnState: 'idle' | 'loading' | 'success' = 'idle';
	let lastStateRef: any = null;

	const unsubscribe = confirmState.subscribe((next) => {
		state = next;
	});

	const close = (value: boolean) => resolveConfirm(value);

	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && state && state.dismissible !== false && confirmBtnState === 'idle' && cancelBtnState === 'idle') close(false);
	};

	$: {
		if (!browser) {
			if (removeKeyListener) {
				removeKeyListener();
				removeKeyListener = null;
			}
		} else if (state && !removeKeyListener) {
			window.addEventListener('keydown', onKeydown);
			removeKeyListener = () => window.removeEventListener('keydown', onKeydown);
		} else if (!state && removeKeyListener) {
			removeKeyListener();
			removeKeyListener = null;
		}
	}

	onDestroy(() => {
		unsubscribe();
		if (removeKeyListener) removeKeyListener();
	});

	$: if (state !== lastStateRef) {
		lastStateRef = state;
		confirmBtnState = 'idle';
		cancelBtnState = 'idle';
	}

	const onConfirm = async () => {
		if (!state) return;
		if (confirmBtnState !== 'idle' || cancelBtnState !== 'idle') return;
		confirmBtnState = 'loading';
		await new Promise((r) => setTimeout(r, 220));
		confirmBtnState = 'success';
		await new Promise((r) => setTimeout(r, 240));
		close(true);
	};

	const onCancel = async () => {
		if (!state) return;
		if (confirmBtnState !== 'idle' || cancelBtnState !== 'idle') return;
		cancelBtnState = 'loading';
		await new Promise((r) => setTimeout(r, 140));
		close(false);
	};
</script>

{#if state}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{state.title}</h3>
			<p class="mt-3 whitespace-pre-line text-sm text-base-content/80">{state.message}</p>
			<div class="modal-action">
				{#if state.showCancel !== false}
					<button
						type="button"
						class="btn ermc-state-btn {cancelBtnState === 'success' ? 'ermc-success-btn' : 'btn-ghost'}"
						disabled={confirmBtnState !== 'idle' || cancelBtnState !== 'idle'}
						on:click={onCancel}
					>
						{#if cancelBtnState === 'loading'}
							<span class="loader" style="transform: scale(0.275); transform-origin: center;"></span>
						{:else}
							{state.cancelText || 'Cancel'}
						{/if}
					</button>
				{/if}
				<button
					type="button"
					class="btn ermc-state-btn {confirmBtnState === 'success' ? 'ermc-success-btn' : 'btn-primary'}"
					disabled={confirmBtnState !== 'idle' || cancelBtnState !== 'idle'}
					on:click={onConfirm}
				>
					{#if confirmBtnState === 'loading'}
						<span class="loader" style="transform: scale(0.275); transform-origin: center;"></span>
					{:else if confirmBtnState === 'success'}
						<span class="ermc-icon-slide-in"><Check size={18} /></span>
					{:else}
						{state.confirmText || 'Confirm'}
					{/if}
				</button>
			</div>
		</div>
		{#if state.dismissible !== false}
			<form method="dialog" class="modal-backdrop" on:submit|preventDefault={() => close(false)}>
				<button>close</button>
			</form>
		{/if}
	</div>
{/if}
