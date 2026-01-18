<script lang="ts">
    import { enhance } from '$app/forms';
    import { Trash2, AlertTriangle, Save } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    export let data;
    const { profile } = data;
    
    let confirmDelete = '';
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

                <form method="POST" action="?/updateProfile" use:enhance>
                    <div class="form-control w-full">
                        <label class="label"><span class="label-text">VATSIM CID</span></label>
                        <input type="text" name="cid" value={profile.cid || ''} class="input input-bordered w-full" />
                    </div>
                    <div class="card-actions justify-end mt-4">
                        <button class="btn btn-primary">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </form>
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

                <form method="POST" action="?/deleteAccount" class="mt-4 space-y-4">
                    <input 
                        type="text" 
                        bind:value={confirmDelete} 
                        placeholder="Type DELETE to confirm" 
                        class="input input-bordered w-full border-error focus:outline-error" 
                    />
                    <button class="btn btn-error w-full" disabled={confirmDelete !== 'DELETE'}>
                        <Trash2 size={18} /> Delete Account
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>
