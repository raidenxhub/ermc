<script lang="ts">
	import { fade } from 'svelte/transition';
	import { X } from 'lucide-svelte';

	let visible = $state(false);

	// Show the toast for 1 second, then hide it after 10 seconds
	setTimeout(() => (visible = true), 1000);
	setTimeout(() => (visible = false), 10000);
</script>

{#if visible}
	<div class="toast toast-center" out:fade={{ duration: 200 }}>
		<div class="alert bg-base-100">
			<button class="btn btn-sm" onclick={() => (visible = false)}>
				<X size={20} />
			</button>

			<span>
				Looking to give ATC feedback? Click <a href="/atc/feedback" class="btn-link text-secondary transition-opacity hover:opacity-50"
					>here</a
				>.
			</span>
		</div>
	</div>
{/if}

<style lang="postcss">
	.alert {
		grid-auto-flow: column;
		grid-template-columns: auto minmax(auto, 1fr);
		justify-items: start;
		text-align: start;
	}
</style>
