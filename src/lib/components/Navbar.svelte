<script lang="ts">
    import { Radar, Info, Menu } from 'lucide-svelte';

    const onclick = (e: MouseEvent) => {
        for (const details of document.querySelectorAll('details')) {
            if (!details.querySelector('summary')?.contains(e.target as Node)) details.open = false;
        }
    };
</script>

<svelte:document {onclick} />

<!-- Drawer Wrapper -->
<div class="drawer drawer-end">
	<!-- Drawer Toggle -->
	<input id="mobile-drawer" type="checkbox" class="drawer-toggle" />

	<div class="drawer-content flex flex-col">
		<div class="navbar bg-transparent px-8">
			<div class="navbar-start">
				<a href="/" aria-label="Home" class="transition-opacity hover:opacity-50">
					<span class="text-2xl font-bold text-secondary">ERMC</span>
				</a>
			</div>

            <div class="navbar-center hidden lg:inline-flex">
                <ul class="menu menu-horizontal gap-1 px-1">
                    <li><a href="/coordination" class="hover:bg-secondary hover:bg-opacity-50"><Radar size={20} /> Coordination</a></li>
                    <li><a href="/dashboard" class="hover:bg-secondary hover:bg-opacity-50"><Info size={20} /> Dashboard</a></li>
                </ul>
            </div>

			<div class="navbar-end hidden lg:inline-flex">
				<div class="inline-flex flex-row">
					<a href="/auth/login" class="btn btn-outline btn-secondary">Login</a>
				</div>
			</div>

            <div class="navbar-end lg:hidden">
                <label for="mobile-drawer" class="btn btn-square btn-ghost hover:bg-secondary hover:bg-opacity-50">
                    <Menu size={28} />
                </label>
            </div>
		</div>
	</div>

	<div class="drawer-side">
		<label for="mobile-drawer" aria-label="close sidebar" class="drawer-overlay"></label>

        <ul class="menu min-h-full w-80 bg-base-200 p-4">
            <li class="menu-title">Navigation</li>
            <li><a href="/coordination"><Radar size={20} /> Coordination</a></li>
            <li><a href="/dashboard"><Info size={20} /> Dashboard</a></li>
        </ul>
	</div>
</div>

<style lang="postcss">
	@media (hover: hover) {
		@supports (color: oklch(0% 0 0)) {
			:where(.menu li:not(.menu-title, .disabled) > *:not(ul, details, .menu-title)):not(.active, .btn):hover {
				@apply bg-secondary;
			}
		}
	}

	.menu li > *:not(ul, .menu-title, details, .btn):active,
	.menu li > *:not(ul, .menu-title, details, .btn).active,
	.menu li > details > summary:active {
		@apply bg-secondary;
		@apply text-white;
	}
</style>
