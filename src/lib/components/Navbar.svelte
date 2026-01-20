<script lang="ts">
	import { goto } from '$app/navigation';
	import { Radar, Info, Menu, LogOut, BarChart3, Settings, Send, FileText, Shield } from 'lucide-svelte';
	import Logo from '$lib/components/Logo.svelte';

	type NavbarUser = {
		id?: string;
		name?: string | null;
		cid?: string | number | null;
		role?: string | null;
		avatar_url?: string | null;
		discord_username?: string | null;
		user_metadata?: Record<string, unknown> | null;
	} | null;

	export let user: NavbarUser = null;

	const avatarSrc = () => {
		const direct = user?.avatar_url;
		if (typeof direct === 'string' && direct.length > 0) return direct;
		const meta = user?.user_metadata || {};
		const metaAvatar =
			(typeof (meta as Record<string, unknown>)?.avatar_url === 'string' && ((meta as Record<string, unknown>).avatar_url as string)) ||
			(typeof (meta as Record<string, unknown>)?.picture === 'string' && ((meta as Record<string, unknown>).picture as string)) ||
			null;
		return metaAvatar;
	};

	const displayName = () => user?.name || user?.discord_username || 'User';
	const displayCid = () => (user?.cid ? String(user.cid) : 'N/A');

	const nav = async (e: MouseEvent, path: string) => {
		e.preventDefault();
		await goto(path);
	};
</script>

<!-- Drawer Wrapper -->
<div class="drawer drawer-end">
	<!-- Drawer Toggle -->
	<input id="mobile-drawer" type="checkbox" class="drawer-toggle" />

	<div class="drawer-content flex flex-col">
		<div class="navbar bg-base-100 shadow-sm px-4 lg:px-8">
			<div class="navbar-start">
				<Logo size={126} />
			</div>

            <div class="navbar-center hidden lg:inline-flex">
                <ul class="menu menu-horizontal gap-1 px-1">
                    <li>
						<a href="/contact" class="font-medium" on:click={(e) => nav(e, '/contact')}><Send size={18} /> Contact</a>
					</li>
                    {#if user}
                        <li>
							<a href="/dashboard" class="font-medium" on:click={(e) => nav(e, '/dashboard')}><Info size={18} /> Dashboard</a>
						</li>
                        <li>
							<a href="/rostering" class="font-medium" on:click={(e) => nav(e, '/rostering')}><Radar size={18} /> Event Rostering</a>
						</li>
                        <li>
							<a href="/coordination" class="font-medium" on:click={(e) => nav(e, '/coordination')}><BarChart3 size={18} /> Coordination</a>
						</li>
                        {#if user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator'}
                             <li>
								<a href="/events/mgmt" class="font-medium" on:click={(e) => nav(e, '/events/mgmt')}><Settings size={18} /> Manage</a>
							</li>
                        {/if}
                    {/if}
                </ul>
            </div>

			<div class="navbar-end hidden lg:inline-flex">
				<div class="inline-flex flex-row items-center gap-4">
                    {#if user}
                         <div class="dropdown dropdown-end">
                            <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
								<div class="w-10 rounded-full">
									{#if avatarSrc()}
										<img src={avatarSrc()} alt={displayName()} />
									{:else}
										<div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center font-bold">
											{displayName().charAt(0).toUpperCase()}
										</div>
									{/if}
								</div>
                            </div>
                            <ul tabindex="-1" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                                <li class="menu-title">
                                    <span>{displayName()}</span>
                                    <span class="text-xs font-normal opacity-70">CID: {displayCid()}</span>
                                </li>
                                <div class="divider my-1"></div>
                                <li>
									<a href="/settings" on:click={(e) => nav(e, '/settings')}><Settings size={16} /> Settings</a>
								</li>
								<li>
									<a href="/terms-of-service" on:click={(e) => nav(e, '/terms-of-service')}><FileText size={16} /> Terms of Service</a>
								</li>
								<li>
									<a href="/terms-of-use" on:click={(e) => nav(e, '/terms-of-use')}><FileText size={16} /> Terms of Use</a>
								</li>
								<li>
									<a href="/privacy" on:click={(e) => nav(e, '/privacy')}><Shield size={16} /> Privacy Policy</a>
								</li>
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
            <li><a href="/contact" on:click={(e) => nav(e, '/contact')}><Send size={20} /> Contact</a></li>
            {#if user}
                <li><a href="/dashboard" on:click={(e) => nav(e, '/dashboard')}><Info size={20} /> Dashboard</a></li>
                <li><a href="/rostering" on:click={(e) => nav(e, '/rostering')}><Radar size={20} /> Event Rostering</a></li>
                <li><a href="/coordination" on:click={(e) => nav(e, '/coordination')}><BarChart3 size={20} /> Coordination</a></li>
                {#if user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator'}
                        <li><a href="/events/mgmt" on:click={(e) => nav(e, '/events/mgmt')}><Settings size={20} /> Manage Events</a></li>
                {/if}
                <div class="divider"></div>
				<li class="menu-title"><span>{displayName()}</span></li>
				<li><a href="/settings" on:click={(e) => nav(e, '/settings')}><Settings size={20} /> Settings</a></li>
				<li><a href="/terms-of-service" on:click={(e) => nav(e, '/terms-of-service')}><FileText size={20} /> Terms of Service</a></li>
				<li><a href="/terms-of-use" on:click={(e) => nav(e, '/terms-of-use')}><FileText size={20} /> Terms of Use</a></li>
				<li><a href="/privacy" on:click={(e) => nav(e, '/privacy')}><Shield size={20} /> Privacy Policy</a></li>
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
