<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { X } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let visible = $state(false);
	let navigatingToContact = $state(false);
	let isHome = $state(false);
	const DISMISS_KEY = 'ermc:contact_toast_dismissed';
	let showTimer: number | null = null;
	let hideTimer: number | null = null;

	const dismissForSession = () => {
		visible = false;
		if (browser) sessionStorage.setItem(DISMISS_KEY, '1');
	};

	const hideForNavigation = () => {
		visible = false;
	};

	const goToContact = async (e: MouseEvent) => {
		e.preventDefault();
		navigatingToContact = true;
		dismissForSession();
		await new Promise((r) => setTimeout(r, 200));
		await goto('/contact');
	};

	onMount(() => {
		const schedule = () => {
			if (!isHome) return;
			if (browser && sessionStorage.getItem(DISMISS_KEY) === '1') return;
			if (showTimer) window.clearTimeout(showTimer);
			if (hideTimer) window.clearTimeout(hideTimer);
			showTimer = window.setTimeout(() => (visible = true), 800);
			hideTimer = window.setTimeout(() => (visible = false), 10000);
		};

		const unsubscribe = page.subscribe((p) => {
			const nextIsHome = p.url.pathname === '/';
			const becameHome = nextIsHome && !isHome;
			isHome = nextIsHome;
			if (!isHome && visible) hideForNavigation();
			if (becameHome) schedule();
		});

		schedule();

		return () => {
			unsubscribe();
			if (showTimer) window.clearTimeout(showTimer);
			if (hideTimer) window.clearTimeout(hideTimer);
		};
	});
</script>

{#if visible && isHome}
	<div class="toast toast-center" out:fade={{ duration: 200 }}>
		<div class="alert bg-base-100">
			<button class="btn btn-sm" onclick={dismissForSession}>
				<X size={20} />
			</button>

			<span>
				Looking to get in touch? Click{' '}
				<a href="/contact" class="text-blue-500 underline hover:text-blue-600" onclick={goToContact}>
					{#if navigatingToContact}
						<span class="loader" style="transform: scale(0.33); transform-origin: center;"></span>
					{:else}
						here
					{/if}
				</a>.
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
