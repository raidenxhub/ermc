<script lang="ts">
	import Navbar from './Navbar.svelte';

	let scrollY = $state<number>();
</script>

<svelte:window bind:scrollY />

<header class="fixed z-10 w-full transition-all" class:backdrop-blur-lg={scrollY}>
	<Navbar />
</header>
