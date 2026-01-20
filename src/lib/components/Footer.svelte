<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
</script>

<footer class="w-full bg-base-300">
	<div class="container">
		<div class="divider m-0"></div>

		<div class="footer footer-center gap-4 py-10">
			<aside>
                <div class="mb-2">
                    <Logo size={44} />
                </div>
                <p class="text-neutral-content font-medium">© 2026 ERMC • Third‑party utility for flight simulation</p>
                <p class="text-xs text-neutral-content/60 max-w-md mx-auto mt-2">
                    Not affiliated with VATSIM or any real-world aviation authority. 
                    For flight simulation use only.
                </p>
			</aside>
            <nav class="flex flex-wrap justify-center gap-4 text-sm text-neutral-content/80">
                <a href="/privacy" class="link link-hover">Privacy Policy</a>
                <a href="/terms-of-service" class="link link-hover">Terms of Service</a>
                <a href="/terms-of-use" class="link link-hover">Terms of Use</a>
                <a href="/contact" class="link link-hover">Contact</a>

				
				<a href="mailto:ermc@realkenan.dev" class="link link-hover">ermc@realkenan.dev</a>	
            </nav>
		</div>
	</div>
</footer>
