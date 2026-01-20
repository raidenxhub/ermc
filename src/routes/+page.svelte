<script lang="ts">
	import type { PageProps } from './$types';
	import { Shield, Radio, CalendarCheck, MessagesSquare, HelpCircle, Send } from 'lucide-svelte';
	import { goto } from '$app/navigation';

let { data }: PageProps = $props();

let contactNavLoading = $state(false);

const goContact = async (e: MouseEvent) => {
	e.preventDefault();
	contactNavLoading = true;
	await goto('/contact');
};
</script>

<main class="flex flex-col text-white">
	<section class="container mx-auto flex min-h-dvh flex-col justify-center px-4 py-20">
		<p class="text-3xl font-semibold text-white/90 md:text-5xl">Welcome to</p>
		<h1 class="mt-2 text-5xl font-bold md:text-7xl">ERMC</h1>
		<p class="mt-4 max-w-2xl text-white/80">
			ERMC (Event Roster Management Control) helps subdivisional flight simulation network teams manage event rostering, with a few extra tools
			for coordination and network awareness.
		</p>

		<div class="mt-8 flex flex-wrap gap-3">
			{#if data.user}
				<a href="/rostering" class="btn btn-primary btn-lg rounded-none">Explore events</a>
				<a href="/contact" class="btn btn-outline btn-lg rounded-none text-white" onclick={goContact}>
					{#if contactNavLoading}
						<span class="loader" style="transform: scale(0.5); transform-origin: center;"></span>
					{:else}
						Get in touch
					{/if}
				</a>
			{:else}
				<a href="/auth/login" class="btn btn-primary btn-lg rounded-none">Start with Discord</a>
				<a href="/contact" class="btn btn-outline btn-lg rounded-none text-white" onclick={goContact}>
					{#if contactNavLoading}
						<span class="loader" style="transform: scale(0.5); transform-origin: center;"></span>
					{:else}
						Get in touch
					{/if}
				</a>
			{/if}
		</div>

		<div class="mt-10 grid gap-4 md:grid-cols-4">
			<div class="rounded-xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<MessagesSquare size={20} />
					<div class="font-semibold">Coordination</div>
				</div>
				<p class="mt-2 text-sm text-white/75">Live event chat, awareness, and presence for effective coordination.</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<CalendarCheck size={20} />
					<div class="font-semibold">Rostering</div>
				</div>
				<p class="mt-2 text-sm text-white/75">Book positions and manage your roster in one place.</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<Radio size={20} />
					<div class="font-semibold">Network Data</div>
				</div>
				<p class="mt-2 text-sm text-white/75">Quick visibility into online controllers and local METARs.</p>
			</div>
			<div class="rounded-xl border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
				<div class="flex items-center gap-3">
					<Shield size={20} />
					<div class="font-semibold">Account Controls</div>
				</div>
				<p class="mt-2 text-sm text-white/75">Discord sign-in, profile onboarding, and clear policy links.</p>
			</div>
		</div>
	</section>

	<section class="container mx-auto px-4 py-16">
		<div class="grid gap-8 lg:grid-cols-2">
			<div class="rounded-2xl border border-white/10 bg-black/25 p-8 backdrop-blur-sm">
				<h2 class="text-3xl font-bold">What ERMC is</h2>
				<p class="mt-3 text-white/80">
					ERMC is built to reduce friction during event operations: fewer spreadsheets, faster coordination, and clearer
					visibility for controllers and event staff.
				</p>
				<ul class="mt-6 space-y-3 text-white/80">
					<li class="flex items-start gap-3">
						<span class="mt-1 h-2 w-2 rounded-full bg-primary"></span>
						<span>Rosters are generated for airports managed by partnered vACCs (free of charge).</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 h-2 w-2 rounded-full bg-primary"></span>
						<span>Coordination tools are tied to active bookings to keep chats relevant.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 h-2 w-2 rounded-full bg-primary"></span>
						<span>Network panels are designed to be quick-glance, not clutter.</span>
					</li>
				</ul>
			</div>

			<div class="rounded-2xl border border-white/10 bg-black/25 p-8 backdrop-blur-sm">
				<h2 class="text-3xl font-bold">Who it’s for</h2>
				<p class="mt-3 text-white/80">
					Controllers and event staff operating within the Khaleej vACC subdivision who want a single place to roster, coordinate,
					and stay aware of network status.
				</p>
				<div class="mt-6 grid gap-4 md:grid-cols-2">
					<div class="rounded-xl border border-white/10 bg-black/25 p-5">
						<div class="font-semibold">Controllers</div>
						<p class="mt-2 text-sm text-white/75">Book shifts, view events, join coordination when you’re active.</p>
					</div>
					<div class="rounded-xl border border-white/10 bg-black/25 p-5">
						<div class="font-semibold">Event Staff</div>
						<p class="mt-2 text-sm text-white/75">Create events, manage rosters, and keep coordination organized.</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="container mx-auto px-4 py-16">
		<div class="mb-8 flex items-center gap-3">
			<HelpCircle size={22} class="text-white/80" />
			<h2 class="text-3xl font-bold">FAQ</h2>
		</div>

		<div class="space-y-3">
			<div class="collapse collapse-plus border border-white/10 bg-black/25 backdrop-blur-sm">
				<input type="checkbox" />
				<div class="collapse-title text-lg font-medium">Do I need Discord to use ERMC?</div>
				<div class="collapse-content text-white/80">
					<p>Yes. Authentication is handled through Discord to keep access simple and consistent.</p>
				</div>
			</div>
			<div class="collapse collapse-plus border border-white/10 bg-black/25 backdrop-blur-sm">
				<input type="checkbox" />
				<div class="collapse-title text-lg font-medium">Which airports are rostered by ERMC?</div>
				<div class="collapse-content text-white/80">
					<p>ERMC manages roster slots for partnered vACCs free of charge. Other airports are handled by their respective vACCs.</p>
				</div>
			</div>
			<div class="collapse collapse-plus border border-white/10 bg-black/25 backdrop-blur-sm">
				<input type="checkbox" />
				<div class="collapse-title text-lg font-medium">Why can’t I see coordination for an event?</div>
				<div class="collapse-content text-white/80">
					<p>Coordination is available when you have an active booking and you’re online with a matching callsign.</p>
				</div>
			</div>
			<div class="collapse collapse-plus border border-white/10 bg-black/25 backdrop-blur-sm">
				<input type="checkbox" />
				<div class="collapse-title text-lg font-medium">How is my data used?</div>
				<div class="collapse-content text-white/80">
					<p>ERMC stores only what’s needed for your profile and rostering. See the Privacy Policy for details.</p>
				</div>
			</div>
		</div>
	</section>

	<section class="container mx-auto px-4 py-16 pb-24">
		<div class="rounded-2xl border border-white/10 bg-black/25 p-10 text-center backdrop-blur-sm">
			<h2 class="text-3xl font-bold">Ready to get in touch?</h2>
			<p class="mx-auto mt-3 max-w-2xl text-white/80">
				Questions, partnerships, or general inquiries — send us a message and we’ll respond as soon as possible.
			</p>
			<div class="mt-6 flex justify-center">
				<a href="/contact" class="btn btn-primary btn-lg rounded-none" onclick={goContact}>
					{#if contactNavLoading}
						<span class="loader" style="transform: scale(0.5); transform-origin: center;"></span>
					{:else}
						<Send size={18} />
					{/if}
					Get in touch now
				</a>
			</div>
		</div>
	</section>
</main>
