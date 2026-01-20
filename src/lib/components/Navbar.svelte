<script lang="ts">
    import { Radar, Info, Menu, LogOut, User, BarChart3, Settings, Send } from 'lucide-svelte';
    export let user: any = null;

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
		<div class="navbar bg-base-100 shadow-sm px-4 lg:px-8">
			<div class="navbar-start">
				<a href="/" aria-label="Home" class="transition-opacity hover:opacity-50">
					<span class="text-2xl font-bold text-primary">ERMC</span>
				</a>
			</div>

            <div class="navbar-center hidden lg:inline-flex">
                <ul class="menu menu-horizontal gap-1 px-1">
                    <li><a href="/contact" class="font-medium"><Send size={18} /> Contact</a></li>
                    {#if user}
                        <li><a href="/dashboard" class="font-medium"><Info size={18} /> Dashboard</a></li>
                        <li><a href="/rostering" class="font-medium"><Radar size={18} /> Event Rostering</a></li>
                        <li><a href="/coordination" class="font-medium"><BarChart3 size={18} /> Coordination</a></li>
                        {#if user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator'}
                             <li><a href="/events/mgmt" class="font-medium"><Settings size={18} /> Manage</a></li>
                        {/if}
                    {/if}
                </ul>
            </div>

			<div class="navbar-end hidden lg:inline-flex">
				<div class="inline-flex flex-row items-center gap-4">
                    {#if user}
                         <div class="dropdown dropdown-end">
                            <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center font-bold text-lg leading-none pb-0.5 shadow-md overflow-hidden">
                                    {#if user.avatar_url}
                                        <img src={user.avatar_url} alt={user.name} />
                                    {:else}
                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    {/if}
                                </div>
                            </div>
                            <ul tabindex="-1" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                                <li class="menu-title">
                                    <span>{user.name || 'User'}</span>
                                    <span class="text-xs font-normal opacity-70">CID: {user.cid || 'N/A'}</span>
                                </li>
                                <div class="divider my-1"></div>
                                <li><a href="/settings"><Settings size={16} /> Settings</a></li>
                                <li>
                                    <form action="/auth/logout" method="POST">
                                        <button type="submit" class="w-full text-left text-error"><LogOut size={16} /> Sign Out</button>
                                    </form>
                                </li>
                            </ul>
                        </div>
                    {:else}
					    <a href="/auth/login" class="btn btn-primary btn-sm">Login</a>
                    {/if}
				</div>
			</div>

            <div class="navbar-end lg:hidden">
                <label for="mobile-drawer" class="btn btn-square btn-ghost">
                    <Menu size={28} />
                </label>
            </div>
		</div>
	</div>

	<div class="drawer-side z-50">
		<label for="mobile-drawer" aria-label="close sidebar" class="drawer-overlay"></label>

        <ul class="menu min-h-full w-80 bg-base-200 p-4">
            <li class="menu-title text-lg mb-2">ERMC Navigation</li>
            <li><a href="/contact"><Send size={20} /> Contact</a></li>
            {#if user}
                <li><a href="/dashboard"><Info size={20} /> Dashboard</a></li>
                <li><a href="/rostering"><Radar size={20} /> Event Rostering</a></li>
                <li><a href="/coordination"><BarChart3 size={20} /> Coordination</a></li>
                {#if user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator'}
                        <li><a href="/events/mgmt"><Settings size={20} /> Manage Events</a></li>
                {/if}
                <div class="divider"></div>
                <li>
                    <form action="/auth/logout" method="POST">
                        <button type="submit" class="text-error"><LogOut size={20} /> Sign Out</button>
                    </form>
                </li>
            {:else}
                <li><a href="/auth/login" class="btn btn-primary btn-outline mb-2">Login</a></li>
            {/if}
        </ul>
	</div>
</div>
