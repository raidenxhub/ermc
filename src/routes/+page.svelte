<script lang="ts">
	import type { PageProps } from './$types';
	import { Sparkles } from 'lucide-svelte';

import bgImage from '$lib/assets/images/bg.png?enhanced';
 

let { data }: PageProps = $props();
</script>

<main class="flex flex-col">
	<section class="relative isolate min-h-dvh overflow-hidden bg-cover bg-center bg-no-repeat">
		<!-- Backround Image -->
		<enhanced:img src={bgImage} alt="" class="absolute inset-0 -z-20 h-full w-full object-cover object-center" />

		<!-- Background Overlay -->
		<div class="absolute inset-0 -z-10 bg-black/70"></div>

		<div class="container mx-auto">
			<div class="flex min-h-dvh flex-col justify-center">
                <div class="flex items-center gap-2 mb-2">
                    <Sparkles class="h-8 w-8 text-white" />
                    <h2 class="text-2xl md:text-4xl">Welcome to</h2>
                </div>
                <h1 class="mt-1 text-5xl font-bold text-white md:text-7xl">ERMC</h1>
                <p class="mt-2 max-w-lg text-gray-300">
                    ERMC is a third‑party coordination utility. Sign in with Discord to access coordination tools and your dashboard.
                </p>
                <div class="mt-6">
                    <a href="/auth/login" class="btn btn-primary btn-lg rounded-none">Start Now</a>
                </div>
            </div>
        </div>

		<!-- Bottom Gradient -->
		<div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-base-300"></div>
	</section>

    {#if data.error}
    <section class="bg-base-300 py-6">
        <div class="container mx-auto">
            <div class="alert alert-error">
                <span>{data.error}</span>
            </div>
        </div>
    </section>
    {/if}

	<!-- <section class="bg-base-300 py-10">
		<div class="container flex flex-col">
			<h2 class="text-4xl">Upcoming Events</h2>
			<div class="divider"></div>
		</div>
	</section> -->

    
</main>
