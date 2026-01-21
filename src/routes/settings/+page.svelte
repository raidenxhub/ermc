<script lang="ts">
    import { browser } from '$app/environment';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { Trash2, AlertTriangle, Check, X } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    export let data;
    const { profile } = data;
    
    let confirmDelete = '';
    let deleteState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

    const useEnhanceDelete = (formEl: HTMLFormElement) => {
        if (!browser) return;
        const submit: SubmitFunction = () => {
            deleteState = 'loading';
            return async ({ result, update }) => {
                if (result.type === 'redirect') {
                    deleteState = 'success';
                    toast.success('Account deleted.');
                    const location = (result as { location: string }).location;
                    await new Promise((r) => setTimeout(r, 2000));
                    if (location === '/' && browser) {
                        window.location.replace('/');
                        return;
                    }
                    await goto(location);
                    return;
                }

                await update({ reset: false });
                deleteState = 'error';
                const message =
                    result.type === 'failure'
                        ? ((result.data as { message?: string })?.message || 'Failed to delete account.')
                        : 'Failed to delete account.';
                toast.error(message);
                setTimeout(() => (deleteState = 'idle'), 2000);
            };
        };
        return enhance(formEl, submit);
    };
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
    <div class="mb-8">
        <h1 class="text-3xl font-bold">Account Settings</h1>
        <p class="text-muted-foreground">Manage your profile and account preferences.</p>
    </div>

    <div class="space-y-6">
        <!-- Profile Info -->
        <div class="card bg-base-100 shadow-sm border">
            <div class="card-body">
                <h2 class="card-title">Profile Information</h2>
                
                <div class="flex items-center gap-4 mb-4">
                    <div class="avatar">
                        <div class="w-16 rounded-full">
                            <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}`} alt={profile.name} />
                        </div>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg">{profile.name}</h3>
                        <p class="text-sm text-muted-foreground">Discord: {profile.discord_username || 'Not linked'}</p>
                    </div>
                </div>

                <div class="form-control w-full">
                    <label class="label" for="vatsim_cid"><span class="label-text">VATSIM CID (Locked)</span></label>
                    <input id="vatsim_cid" type="text" value={profile.cid || ''} disabled class="input input-bordered w-full bg-base-200" />
                    <div class="mt-2 text-xs text-base-content/70">To change your CID, contact support.</div>
                </div>

                <div class="mt-6 rounded-lg border bg-base-200 p-4 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="font-semibold">VATSIM Details (Verified)</div>
                        {#if profile.rating_short}
                            <span class="badge badge-success">{profile.rating_short}</span>
                        {/if}
                    </div>
                    <div class="grid gap-2 text-sm md:grid-cols-2">
                        {#if profile.name}<div><span class="text-base-content/70">Name</span>: {profile.name}</div>{/if}
                        {#if profile.rating_long}<div><span class="text-base-content/70">Rating</span>: {profile.rating_long}</div>{/if}
                        {#if profile.vatsim_region_id}<div><span class="text-base-content/70">Region ID</span>: {profile.vatsim_region_id}</div>{/if}
                        {#if profile.vatsim_division_id}<div><span class="text-base-content/70">Division ID</span>: {profile.vatsim_division_id}</div>{/if}
                        {#if profile.vatsim_subdivision_id}<div><span class="text-base-content/70">Subdivision ID</span>: {profile.vatsim_subdivision_id}</div>{/if}
                        {#if profile.vatsim_country}<div><span class="text-base-content/70">Country</span>: {profile.vatsim_country}</div>{/if}
                        {#if profile.vatsim_countystate}<div><span class="text-base-content/70">County/State</span>: {profile.vatsim_countystate}</div>{/if}
                        {#if profile.vatsim_pilotrating}<div><span class="text-base-content/70">Pilot Rating</span>: {profile.vatsim_pilotrating}</div>{/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Discord Account -->
        <div class="card bg-base-100 shadow-sm border">
            <div class="card-body">
                <h2 class="card-title">Discord Account</h2>
                <p class="text-sm text-muted-foreground">Manage your linked Discord account.</p>
                
                <div class="flex flex-col gap-4 mt-2">
                    <div class="flex items-center justify-between p-3 border rounded-lg">
                        <div class="flex items-center gap-3">
                            <div class="avatar">
                                <div class="w-10 rounded-full">
                                    <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}`} alt="" />
                                </div>
                            </div>
                            <div>
                                <div class="font-medium">{profile.discord_username || 'Unknown'}</div>
                                <div class="text-xs text-muted-foreground">Linked Account</div>
                            </div>
                        </div>
                        <form action="/auth/login" method="GET">
                             <button class="btn btn-sm btn-outline">
                                Refresh / Switch
                             </button>
                        </form>
                    </div>
                    <p class="text-xs text-muted-foreground">To switch accounts or refresh your avatar/username, simply log in again with the desired Discord account.</p>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="card bg-base-100 shadow-sm border border-error/20">
            <div class="card-body">
                <h2 class="card-title text-error">Danger Zone</h2>
                <p class="text-sm text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
                
                <div class="alert alert-warning text-sm mt-4">
                    <AlertTriangle size={18} />
                    <span>Type <strong>DELETE</strong> to confirm account deletion.</span>
                </div>

                <form method="POST" action="?/deleteAccount" class="mt-4 space-y-4" use:useEnhanceDelete>
                    <input 
                        type="text" 
                        bind:value={confirmDelete} 
                        placeholder="Type DELETE to confirm" 
                        class="input input-bordered w-full border-error focus:outline-error" 
                    />
                    <button
                        class="btn ermc-state-btn {deleteState === 'success' ? 'ermc-success-btn' : 'btn-error'} w-full"
                        disabled={confirmDelete !== 'DELETE' || deleteState === 'loading' || deleteState === 'success'}
                    >
                        {#if deleteState === 'loading'}
                            <span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
                        {:else if deleteState === 'success'}
                            <span class="ermc-icon-slide-in"><Check size={18} /></span>
                        {:else if deleteState === 'error'}
                            <X size={18} />
                        {:else}
                            <Trash2 size={18} /> Delete Account
                        {/if}
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>
