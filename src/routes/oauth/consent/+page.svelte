<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Check, LoaderCircle } from 'lucide-svelte';

	export let data: { destination: string };

	let state: 'loading' | 'success' = 'loading';

	onMount(async () => {
		await new Promise((r) => setTimeout(r, 900));
		state = 'success';
		await new Promise((r) => setTimeout(r, 700));
		await goto(data.destination);
	});
</script>

<div class="flex h-screen flex-col items-center justify-center bg-base-300">
	<div class="card w-96 bg-base-100 shadow-xl">
		<div class="card-body items-center text-center">
			{#if state === 'loading'}
				<LoaderCircle size={32} class="animate-spin text-primary" />
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
