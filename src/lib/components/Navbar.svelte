<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
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
	export let navLoading = false;
	let contactNavLoading = false;
	let compact = false;
	let isHome = false;

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

	const meta = () => (user?.user_metadata && typeof user.user_metadata === 'object' ? (user.user_metadata as Record<string, unknown>) : {});
	const metaFullName = () => {
		const m = meta();
		const v = (typeof m.full_name === 'string' && m.full_name) || (typeof m.name === 'string' && m.name) || null;
		return v && v.trim().length > 0 ? v.trim() : null;
	};

	const displayName = () => user?.name || metaFullName() || user?.discord_username || 'User';
	const displayCid = () => (user?.cid ? String(user.cid) : '—');

	const nav = async (e: MouseEvent, path: string) => {
		e.preventDefault();
		if (path === '/contact') contactNavLoading = true;
		try {
			await goto(path);
		} finally {
			contactNavLoading = false;
		}
	};

	const labelCls = () =>
		compact
			? 'max-w-0 opacity-0 -translate-x-1 group-hover:max-w-[240px] group-hover:opacity-100 group-hover:translate-x-0'
			: 'max-w-[240px] opacity-100 translate-x-0';

	const pillCls = () =>
		compact
			? 'bg-transparent shadow-none px-2 py-3'
			: 'bg-transparent shadow-none px-2 py-3';

	const linkCls = () =>
		compact
			? 'bg-white/0 hover:bg-white/10 text-white'
			: 'bg-white/0 hover:bg-white/10 text-white';

	onMount(() => {
		if (!browser) return;

		const update = () => {
			compact = isHome && window.scrollY > 8;
		};

		const unsubscribe = page.subscribe((p) => {
			isHome = p.url.pathname === '/';
			update();
		});

		window.addEventListener('scroll', update, { passive: true });
		update();

		return () => {
			window.removeEventListener('scroll', update);
			unsubscribe();
		};
	});
</script>

<!-- Drawer Wrapper -->
<div class="drawer drawer-end">
	<!-- Drawer Toggle -->
	<input id="mobile-drawer" type="checkbox" class="drawer-toggle" />

	<div class="drawer-content flex flex-col">
		<div class="sticky top-0 z-50 w-full">
			<div class="container mx-auto px-4 py-2">
				<div class="flex w-full items-center gap-3 transition-all duration-300 {pillCls()}">
					<a
						href="/"
						class="inline-flex items-center gap-2 rounded-xl px-2 py-1 transition-all duration-300 {compact ? 'pr-1' : ''}"
						on:click={(e) => nav(e, '/')}
					>
						<Logo href={null} size={compact ? 96 : 189} />
					</a>

					<div class="hidden lg:inline-flex items-center gap-1 transition-opacity duration-200 {navLoading ? 'opacity-60' : 'opacity-100'}">
						<a
							href="/contact"
							class="group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all duration-300 {linkCls()}"
							on:click={(e) => nav(e, '/contact')}
						>
							{#if contactNavLoading}
								<span class="loader" style="transform: scale(0.33); transform-origin: center;"></span>
							{:else}
								<Send size={compact ? 18 : 20} />
							{/if}
							<span class="overflow-hidden whitespace-nowrap transition-all duration-300 {labelCls()}">Get in touch</span>
						</a>

						{#if user}
							<a
								href="/dashboard"
								class="group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all duration-300 {linkCls()}"
								on:click={(e) => nav(e, '/dashboard')}
							>
								<Info size={compact ? 18 : 20} />
								<span class="overflow-hidden whitespace-nowrap transition-all duration-300 {labelCls()}">Dashboard</span>
							</a>
							<a
								href="/rostering"
								class="group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all duration-300 {linkCls()}"
								on:click={(e) => nav(e, '/rostering')}
							>
								<Radar size={compact ? 18 : 20} />
								<span class="overflow-hidden whitespace-nowrap transition-all duration-300 {labelCls()}">Event Rostering</span>
							</a>
							<a
								href="/coordination"
								class="group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all duration-300 {linkCls()}"
								on:click={(e) => nav(e, '/coordination')}
							>
								<BarChart3 size={compact ? 18 : 20} />
								<span class="overflow-hidden whitespace-nowrap transition-all duration-300 {labelCls()}">Coordination</span>
							</a>
							{#if (user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator') && user.cid}
								<a
									href="/events/mgmt"
									class="group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium transition-all duration-300 {linkCls()}"
									on:click={(e) => nav(e, '/events/mgmt')}
								>
									<Settings size={compact ? 18 : 20} />
									<span class="overflow-hidden whitespace-nowrap transition-all duration-300 {labelCls()}">Manage Events</span>
								</a>
							{/if}
						{/if}
					</div>

					<div class="hidden lg:inline-flex items-center gap-2 ml-auto">
							{#if user}
								<div class="dropdown dropdown-end">
									<div tabindex="0" role="button" class="btn btn-ghost btn-circle transition-all duration-300">
										<div class="avatar">
											<div
												class="overflow-hidden rounded-full transition-all duration-300 {compact ? 'w-9 h-9' : 'w-14 h-14'} aspect-square"
											>
											{#if navLoading || (!user.cid && !user.name)}
												<div class="w-full h-full flex items-center justify-center">
													<span class="loader" style="transform: scale(0.33); transform-origin: center;"></span>
												</div>
											{:else if avatarSrc()}
												<img src={avatarSrc()} alt={displayName()} class="w-full h-full object-cover" />
											{:else}
												<div class="w-full h-full rounded-full bg-base-300 flex items-center justify-center font-bold">
													{displayName().charAt(0).toUpperCase()}
												</div>
											{/if}
											</div>
										</div>
									</div>
									<ul tabindex="-1" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-64">
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

					<div class="lg:hidden ml-auto">
							<label for="mobile-drawer" class="btn btn-square btn-ghost">
								<Menu size={28} />
							</label>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="drawer-side z-50">
		<label for="mobile-drawer" aria-label="close sidebar" class="drawer-overlay"></label>

        <ul class="menu min-h-full w-80 bg-base-200 p-4">
            <li class="menu-title text-lg mb-2">ERMC Navigation</li>
            <li>
				<a href="/contact" on:click={(e) => nav(e, '/contact')}>
					{#if contactNavLoading}
						<span class="loader" style="transform: scale(0.33); transform-origin: center;"></span>
					{:else}
						<Send size={20} />
					{/if}
					Contact
				</a>
			</li>
            {#if user}
                <li><a href="/dashboard" on:click={(e) => nav(e, '/dashboard')}><Info size={20} /> Dashboard</a></li>
                <li><a href="/rostering" on:click={(e) => nav(e, '/rostering')}><Radar size={20} /> Event Rostering</a></li>
                <li><a href="/coordination" on:click={(e) => nav(e, '/coordination')}><BarChart3 size={20} /> Coordination</a></li>
                {#if (user.role === 'staff' || user.role === 'admin' || user.role === 'coordinator') && user.cid}
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
