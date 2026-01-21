<script lang="ts">
    import { browser } from '$app/environment';
    import { enhance } from '$app/forms';
    import { Check, X, Lock } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    let state: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

    const useEnhanceDevLogin = (formEl: HTMLFormElement) => {
        if (!browser) return;
        const submit: SubmitFunction = () => {
            state = 'loading';
            return async ({ result, update }) => {
                if (result.type === 'redirect') {
                    state = 'success';
                    return;
                }
                await update({ reset: false });
                state = 'error';
                const message =
                    result.type === 'failure'
                        ? ((result.data as { message?: string })?.message || 'Login failed.')
                        : 'Login failed.';
                toast.error(message);
                setTimeout(() => (state = 'idle'), 2000);
            };
        };
        return enhance(formEl, submit);
    };
</script>

<div class="container mx-auto px-4 py-16 max-w-md">
    <div class="mb-6 text-center">
        <h1 class="text-3xl font-bold">Developer Login</h1>
        <p class="text-muted-foreground">Use the test account credentials to access a controller account.</p>
    </div>

    <div class="rounded-xl border bg-card text-card-foreground shadow">
        <div class="p-6">
            <div class="alert alert-warning mb-4 text-sm">
                <Lock size={16} />
                <span>Restricted to test account: CID 000000 and Full Name "ERMC VATSIM TEST #1".</span>
            </div>
            <form method="POST" action="?/login" class="space-y-4" use:useEnhanceDevLogin>
                <div class="form-control">
                    <label class="label" for="cid"><span class="label-text">CID</span></label>
                    <input id="cid" name="cid" type="text" placeholder="000000" class="input input-bordered" required />
                </div>
                <div class="form-control">
                    <label class="label" for="full_name"><span class="label-text">Full Name</span></label>
                    <input id="full_name" name="full_name" type="text" placeholder="ERMC VATSIM TEST #1" class="input input-bordered" required />
                </div>
                <button
                    class="btn ermc-state-btn {state === 'success' ? 'ermc-success-btn' : state === 'error' ? 'btn-error' : 'btn-primary'} w-full"
                    disabled={state === 'loading' || state === 'success'}
                >
                    {#if state === 'loading'}
                        <span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
                    {:else if state === 'success'}
                        <span class="ermc-icon-slide-in"><Check size={18} /></span>
                    {:else if state === 'error'}
                        <X size={18} />
                    {:else}
                        Login
                    {/if}
                </button>
            </form>
        </div>
    </div>
</div>
