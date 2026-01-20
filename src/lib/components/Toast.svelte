<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { X } from 'lucide-svelte';

	let visible = $state(false);

	onMount(() => {
		const consent = localStorage.getItem('cookie-consent');
		if (!consent) return;

		const seen = sessionStorage.getItem('contact-toast-seen');
		if (seen) return;
		sessionStorage.setItem('contact-toast-seen', '1');

		setTimeout(() => (visible = true), 800);
		setTimeout(() => (visible = false), 10000);
	});
</script>

{#if visible}
	<div class="toast toast-center" out:fade={{ duration: 200 }}>
		<div class="alert bg-base-100">
			<button class="btn btn-sm" onclick={() => (visible = false)}>
				<X size={20} />
			</button>

			<span>
				Looking to get in touch? Click <a href="/contact" class="btn-link text-secondary transition-opacity hover:opacity-50"
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
