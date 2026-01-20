<script lang="ts">
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { Trash2, AlertTriangle, Save, Check, X, LoaderCircle } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    export let data;
    const { profile } = data;
    
    let confirmDelete = '';
    let saveState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    let deleteState: 'idle' | 'loading' | 'success' | 'error' = 'idle';

    const enhanceSave = enhance(() => {
        saveState = 'loading';
        return async ({ result, update }) => {
            if (result.type === 'success') {
                saveState = 'success';
                toast.success('Saved successfully.');
                await update({ reset: false });
                setTimeout(() => (saveState = 'idle'), 2000);
                return;
            }

            await update({ reset: false });
            saveState = 'error';
            const message =
                result.type === 'failure'
                    ? ((result.data as { message?: string })?.message || 'Failed to save changes.')
                    : 'Failed to save changes.';
            toast.error(message);
            setTimeout(() => (saveState = 'idle'), 2000);
        };
    });

    const enhanceDelete = enhance(() => {
        deleteState = 'loading';
        return async ({ result, update }) => {
            if (result.type === 'redirect') {
                deleteState = 'success';
                toast.success('Account deleted.');
                const location = (result as { location: string }).location;
                await new Promise((r) => setTimeout(r, 2000));
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
    });
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

                <form method="POST" action="?/updateProfile" use:enhanceSave>
                    <div class="form-control w-full">
                        <label class="label"><span class="label-text">VATSIM CID</span></label>
                        <input type="text" name="cid" value={profile.cid || ''} class="input input-bordered w-full" />
                    </div>
                    <div class="card-actions justify-end mt-4">
                        <button
                            class="btn {saveState === 'success' ? 'btn-success' : saveState === 'error' ? 'btn-error' : 'btn-primary'}"
                            disabled={saveState === 'loading' || saveState === 'success'}
                        >
                            {#if saveState === 'loading'}
                                <LoaderCircle size={18} class="animate-spin" /> Saving...
                            {:else if saveState === 'success'}
                                <Check size={18} /> Saved
                            {:else if saveState === 'error'}
                                <X size={18} /> Failed
                            {:else}
                                <Save size={18} /> Save Changes
                            {/if}
                        </button>
                    </div>
                </form>
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

                <form method="POST" action="?/deleteAccount" class="mt-4 space-y-4" use:enhanceDelete>
                    <input 
                        type="text" 
                        bind:value={confirmDelete} 
                        placeholder="Type DELETE to confirm" 
                        class="input input-bordered w-full border-error focus:outline-error" 
                    />
                    <button
                        class="btn {deleteState === 'success' ? 'btn-success' : 'btn-error'} w-full"
                        disabled={confirmDelete !== 'DELETE' || deleteState === 'loading' || deleteState === 'success'}
                    >
                        {#if deleteState === 'loading'}
                            <LoaderCircle size={18} class="animate-spin" /> Deleting...
                        {:else if deleteState === 'success'}
                            <Check size={18} /> Deleted
                        {:else if deleteState === 'error'}
                            <X size={18} /> Failed
                        {:else}
                            <Trash2 size={18} /> Delete Account
                        {/if}
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>
