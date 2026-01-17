<script lang="ts">
    import Discord from './icons/Discord.svelte';
</script>

<footer class="w-full bg-base-300">
	<div class="container">
		<div class="divider m-0"></div>

		<div class="footer footer-center gap-8 py-10">
			<aside>
                <a href="/" aria-label="Home" class="transition-opacity hover:opacity-50">
                    <enhanced:img src="../assets/images/logo_footer.png" alt="ERMC Footer Logo" class="h-24 w-auto" />
                </a>

                <p class="text-neutral-content">© 2026 ERMC • Third‑party utility for Khaleej vACC</p>
			</aside>

            <nav class="grid-flow-col gap-4">
                <a href="https://discord.com" aria-label="Discord" class="hover:opacity-50 transition-opacity">
                    <Discord class="fill-current w-6 h-6" />
                </a>
            </nav>
		</div>
	</div>
</footer>
