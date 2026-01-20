<script lang="ts">
	export let size = 40;
	export let href: string | null = '/';
	export let alt = 'ERMC';

	let showFallback = false;
</script>

{#if href}
	<a {href} aria-label="Home" class="inline-flex items-center gap-3 transition-opacity hover:opacity-50">
		{#if showFallback}
			<span class="text-2xl font-bold text-primary">ERMC</span>
		{:else}
			<img
				src="/image.png"
				{alt}
				width={size}
				height={size}
				class="block"
				on:error={() => (showFallback = true)}
			/>
		{/if}
	</a>
{:else}
	{#if showFallback}
		<span class="text-2xl font-bold text-primary">ERMC</span>
	{:else}
		<img
			src="/image.png"
			{alt}
			width={size}
			height={size}
			class="block"
			on:error={() => (showFallback = true)}
		/>
	{/if}
{/if}
