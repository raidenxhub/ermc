<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Check } from 'lucide-svelte';

	export let data: { destination: string };

	let state: 'loading' | 'success' = 'loading';

	onMount(async () => {
		await new Promise((r) => setTimeout(r, 350));
		state = 'success';
		await new Promise((r) => setTimeout(r, 350));
		await goto(data.destination);
	});
</script>

<div class="flex min-h-dvh flex-col items-center justify-center">
	<div class="card w-96 bg-base-100 shadow-xl">
		<div class="card-body items-center text-center">
			{#if state === 'loading'}
				<span class="loader" style="transform: scale(0.667); transform-origin: center;"></span>
			{:else}
				<div class="text-success">
					<Check size={32} />
				</div>
			{/if}

			<h2 class="card-title mt-4">Discord connected</h2>
			<p>
				{#if state === 'loading'}
					Please wait while we verify your authorization.
				{:else}
					Redirecting you now...
				{/if}
			</p>
		</div>
	</div>
</div>
