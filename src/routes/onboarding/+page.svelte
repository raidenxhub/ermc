<script lang="ts">
    import { browser } from '$app/environment';
    import { UserPlus, Check, X, Eye, EyeOff } from 'lucide-svelte';
    import { onDestroy, onMount } from 'svelte';
    import { confirm } from '$lib/confirm';
    import { toast } from 'svelte-sonner';

    export let form;
    export let data;

    let submitState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    type CidVerifyState = 'idle' | 'loading' | 'success' | 'error';
    let cidVerifyState: CidVerifyState = 'idle';
    let cidVerifyMessage = '';
    let cidValue = '';
    let cidVerifiedValue = '';
    let cidMember: any = null;
    let cidDebounceTimer: number | null = null;
    let cidRequestToken = 0;
    let fullNameValue = '';
    let isStaffChecked = false;
    let positionValue = '';
    type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

    const verifyCid = async (cid: string) => {
        if (!browser) return;
        const trimmed = cid.trim();
        if (!trimmed) {
            cidVerifyState = 'idle';
            cidVerifyMessage = '';
            cidVerifiedValue = '';
            cidMember = null;
            return;
        }
        if (!/^\d{4,10}$/.test(trimmed)) {
            cidVerifyState = 'error';
            cidVerifyMessage = 'CID must be 4–10 digits.';
            cidVerifiedValue = '';
            cidMember = null;
            return;
        }

        const token = ++cidRequestToken;
        cidVerifyState = 'loading';
        cidVerifyMessage = '';
        try {
            const res = await fetch(`/api/vatsim/member?cid=${encodeURIComponent(trimmed)}`);
            const payload = await res.json().catch(() => null);
            if (token !== cidRequestToken) return;
            if (!res.ok || !payload?.ok) {
                cidVerifyState = 'error';
                cidVerifyMessage = payload?.message || 'Unable to verify CID right now.';
                cidVerifiedValue = '';
                cidMember = null;
                return;
            }
            cidVerifyState = 'success';
            cidVerifiedValue = trimmed;
            cidMember = payload.member;
            const nameFromCid = typeof payload?.member?.name === 'string' ? payload.member.name.trim() : '';
            if (nameFromCid && !fullNameValue) fullNameValue = nameFromCid;
        } catch {
            if (token !== cidRequestToken) return;
            cidVerifyState = 'error';
            cidVerifyMessage = 'Unable to verify CID right now.';
            cidVerifiedValue = '';
            cidMember = null;
        }
    };

    const onCidInput = (value: string) => {
        cidValue = value;
        if (!browser) return;
        if (cidDebounceTimer) window.clearTimeout(cidDebounceTimer);
        cidDebounceTimer = window.setTimeout(() => void verifyCid(value), 650);
    };

    onDestroy(() => {
        if (!browser) return;
        if (cidDebounceTimer) window.clearTimeout(cidDebounceTimer);
        if (draftSaveTimer) window.clearTimeout(draftSaveTimer);
    });

    onMount(() => {
        if (!browser) return;
        try {
            const raw = localStorage.getItem(draftKey());
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (typeof parsed?.cidValue === 'string') cidValue = parsed.cidValue;
            if (typeof parsed?.fullNameValue === 'string') fullNameValue = parsed.fullNameValue;
            if (typeof parsed?.isStaffChecked === 'boolean') isStaffChecked = parsed.isStaffChecked;
            if (typeof parsed?.positionValue === 'string') positionValue = parsed.positionValue;
            if (typeof parsed?.termsAccepted === 'boolean') termsAccepted = parsed.termsAccepted;
            if (cidValue.trim()) void verifyCid(cidValue);
        } catch {
            return;
        }
    });

    $: if (browser) scheduleDraftSave({ cidValue, fullNameValue, isStaffChecked, positionValue, termsAccepted });

    const confirmCidOnSubmit = () => {
        const cid = cidValue.trim();
        const message = ['CID: ' + cid, '', 'Are you sure this is your VATSIM CID? Please double-check before continuing.'].join('\n');
        return confirm({ title: 'Confirm your CID', message, confirmText: 'Continue', cancelText: 'Cancel' });
    };

    const postFormData = async (url: string, formData: FormData, timeoutMs = 15000) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
            const payload = await res.json().catch(() => null);
            return { res, payload };
        } finally {
            window.clearTimeout(timer);
        }
    };

    const postJson = async (url: string, timeoutMs = 15000) => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: controller.signal });
            const payload = await res.json().catch(() => null);
            return { res, payload };
        } finally {
            window.clearTimeout(timer);
        }
    };

    const handleCompleteRegistration = async () => {
        if (!browser) return;
        if (!onboardingForm) return;
        if (submitState === 'loading' || submitState === 'success') return;

        if (cidVerifyState !== 'success' || cidVerifiedValue !== cidValue.trim()) {
            submitState = 'error';
            toast.error('Please verify your CID before continuing.');
            setTimeout(() => (submitState = 'idle'), 2000);
            return;
        }

        if (isStaffChecked && (!positionValue || positionValue.trim().length === 0)) {
            submitState = 'error';
            toast.error('Please enter your staff position.');
            setTimeout(() => (submitState = 'idle'), 2000);
            return;
        }

        const ok = await confirmCidOnSubmit();
        if (!ok) return;

        submitState = 'loading';
        try {
            const formData = new FormData(onboardingForm);
            const { res, payload } = await postFormData('/api/onboarding/complete', formData);
            if (res.ok && payload?.ok && typeof payload.redirectTo === 'string') {
                submitState = 'success';
                clearDraft();
                await new Promise((r) => setTimeout(r, 300));
                window.location.replace(payload.redirectTo);
                return;
            }
            const msg = payload?.message || 'Registration failed. Please try again.';
            submitState = 'error';
            toast.error(msg);
            setTimeout(() => (submitState = 'idle'), 2000);
        } catch (e) {
            submitState = 'error';
            toast.error('Registration failed. Please try again.');
            setTimeout(() => (submitState = 'idle'), 2000);
        }
    };

    const handleCancelRegistration = async () => {
        if (!browser) return;
        if (cancelState === 'loading' || cancelState === 'success') return;
        
        const ok = await confirm({
            title: 'Cancel registration',
            message: 'This will delete your account immediately.\n\nDo you want to continue?',
            confirmText: 'Cancel registration',
            cancelText: 'Keep account'
        });
        if (!ok) return;

        cancelState = 'loading';
        try {
            const { res, payload } = await postJson('/api/account/cancel');
            if (res.ok && payload?.ok && typeof payload.redirectTo === 'string') {
                cancelState = 'success';
                clearDraft();
                window.location.replace(payload.redirectTo);
                return;
            }
            if (isStaffChecked && (!positionValue || positionValue.trim().length === 0)) {
                cancel();
                submitState = 'error';
                toast.error('Please enter your staff position.');
                setTimeout(() => (submitState = 'idle'), 2000);
                return;
            }
            const ok = await confirmCidOnSubmit();
            if (!ok) {
                cancel();
                submitState = 'idle';
                return;
            }
            submitState = 'loading';
            return async ({ result, update }) => {
                console.log('[Registration] Raw result:', result);
                
                try {
                    // Force type detection if missing (shouldn't happen with SvelteKit, but safety net)
                    const type = (result as any)?.type || 'error'; 
                    
                    if (type === 'redirect') {
                        submitState = 'success';
                        clearDraft();
                        const location = (result as { location: string }).location;
                        await new Promise((r) => setTimeout(r, 450));
                        window.location.replace(location);
                        return;
                    }

                    if (type === 'success') {
                        submitState = 'success';
                        clearDraft();
                        await new Promise((r) => setTimeout(r, 450));
                        window.location.replace('/dashboard');
                        return;
                    }

                    submitState = 'error';
                    let errMsg = '';

                    if (type === 'error') {
                        // Check multiple error paths and prioritize explicit messages
                        errMsg = typeof (result as any)?.error?.message === 'string' ? String((result as any).error.message) : '';
                        if (!errMsg && (result as any)?.data?.message) errMsg = (result as any).data.message;
                        if (!errMsg && (result as any)?.error) errMsg = JSON.stringify((result as any).error);
                    } else if (type === 'failure') {
                         errMsg = (result as any).data?.message || '';
                         if (!errMsg && (result as any)?.data) errMsg = JSON.stringify((result as any).data);
                    }

                    // Final fallback if errMsg is still empty/undefined
                    if (!errMsg) {
                        errMsg = `Unknown error (Type: ${type})`;
                        console.error('[Registration] Unknown error result structure:', result);
                    }

                    toast.error(errMsg);
                    setTimeout(() => (submitState = 'idle'), 2000);
                    
                    await update({ reset: false });
                } catch (e) {
                    console.error('[Registration] Client error:', e);
                    submitState = 'error';
                    toast.error(`Registration exception: ${String(e)}`);
                    setTimeout(() => (submitState = 'idle'), 2000);
                }
            };
        };
        return enhance(formEl, submit);
    };

    const useEnhanceCancelRegistration = (formEl: HTMLFormElement) => {
        if (!browser) return;
        const submit: SubmitFunction = async ({ cancel: _ }) => {
            cancelState = 'loading'; // Ensure state is loading when submission actually starts
            return async ({ result, update }) => {
                console.log('[CancelRegistration] Result:', result);
                if (result.type === 'redirect') {
                    cancelState = 'success';
                    window.location.replace(result.location);
                    return;
                }
                
                cancelState = 'error';
                let msg = 'Cancellation failed.';
                
                if (result.type === 'failure') {
                    msg = (result.data as any)?.message || msg;
                } else if (result.type === 'error') {
                    msg = (result.error as any)?.message || msg;
                }
                
                toast.error(msg);
                setTimeout(() => (cancelState = 'idle'), 2000);
                await update();
            };
        };
        return enhance(formEl, submit);
    };
</script>

<main class="flex flex-col min-h-screen">
	<section class="flex-grow">
		<div class="container mx-auto flex items-center justify-center py-20">
			<div class="card w-full max-w-2xl bg-base-100/90 shadow-xl backdrop-blur-sm">
				<div class="card-body">
					<div class="flex flex-col items-center gap-4 text-center">
						<div class="rounded-full bg-primary/10 p-4 text-primary">
							<UserPlus size={48} />
						</div>
						<h1 class="text-3xl font-bold">Complete Your Profile</h1>
						<p class="text-base-content/70">Welcome to ERMC! We will use your Discord account details to set up your profile.</p>
					</div>

					<div class="divider"></div>

                    {#if form?.message}
                        <div role="alert" class="alert alert-error">
                            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{form.message}</span>
                        </div>
                    {/if}

					<form
                        method="POST"
                        use:useEnhanceOnboarding
                        class="flex flex-col gap-6"
                    >
                    <div class="rounded-lg border bg-base-200 p-4 space-y-2">
                        <p class="text-sm">We will store your Discord username and email to personalize your ERMC account.</p>
                        <div class="grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="label" for="discord_username"><span class="label-text">Discord Username</span></label>
                                <input id="discord_username" type="text" value={data?.user?.user_metadata?.user_name || data?.user?.user_metadata?.name || ''} disabled class="input input-bordered w-full bg-base-200" />
                            </div>
                            <div>
                                <label class="label" for="email"><span class="label-text">Email</span></label>
                                <input id="email" type="email" value={data?.user?.email || data?.user?.user_metadata?.email || ''} disabled class="input input-bordered w-full bg-base-200" />
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="label" for="cid"><span class="label-text">VATSIM CID</span></label>
                            <div class="relative">
                                <input
                                    name="cid"
                                    id="cid"
                                    type="text"
                                    bind:value={cidValue}
                                    on:input={(e) => onCidInput((e.currentTarget as HTMLInputElement).value)}
                                    placeholder="e.g. 1000000"
                                    inputmode="numeric"
                                    pattern={'\\d{4,10}'}
                                    minlength="4"
                                    maxlength="10"
                                    class="input input-bordered w-full pr-12"
                                    required
                                />
                                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                                    {#if cidVerifyState === 'loading'}
                                        <span class="loader" style="transform: scale(0.35); transform-origin: center;"></span>
                                    {:else if cidVerifyState === 'success'}
                                        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success text-success-content">
                                            <Check size={16} />
                                        </span>
                                    {:else if cidVerifyState === 'error'}
                                        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-error text-error-content">
                                            <X size={16} />
                                        </span>
                                    {/if}
                                </div>
                            </div>
                            {#if cidVerifyMessage}
                                <div class="mt-2 text-xs text-error">{cidVerifyMessage}</div>
                            {/if}
                            <div class="mt-2 text-xs text-base-content/70">
                                Your CID and verified details are locked after onboarding. Contact support to change them.
                            </div>
                        </div>

                        <div>
                            <div class="label"><span class="label-text">VATSIM Name</span></div>
                            {#if cidVerifyState === 'success' && cidMember?.name && !showNameInput}
                                <input type="hidden" name="full_name" value={fullNameValue} />
                                <div class="rounded-lg border bg-base-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
                                    <span class="font-medium">{fullNameValue}</span>
                                    <button type="button" class="btn btn-xs btn-ghost" on:click={() => (showNameInput = true)}>Edit</button>
                                </div>
                            {:else}
                                <input
                                    name="full_name"
                                    id="full_name"
                                    type="text"
                                    bind:value={fullNameValue}
                                    placeholder="e.g. John Doe"
                                    class="input input-bordered w-full"
                                    required
                                    on:input={() => (nameTouched = true)}
                                />
                                <div class="mt-2 text-xs text-base-content/70">
                                    If we can’t fetch your name from VATSIM, enter it manually.
                                </div>
                            {/if}
>>>>>>> parent of 678cf79 (Polish confirmations, enforce KHLJ-only VATSIM, and improve UI feedback)
                        </div>
                        <div class="md:col-span-2 md:max-w-md md:mx-auto">
                            <label class="label" for="subdivision"><span class="label-text">Subdivision</span></label>
                            <select name="subdivision" id="subdivision" class="select select-bordered w-full" required>
                                <option value="Khaleej vACC" selected>Khaleej vACC</option>
                            </select>
                            <div class="mt-2 text-xs text-base-content/70">
                                Want to integrate ERMC for your subdivision? <a href="/contact" class="link link-primary">Get in touch now.</a>
                            </div>
                        </div>
                    </div>

                    {#if cidVerifyState === 'success' && cidMember}
                        <div class="rounded-lg border bg-base-200 p-4 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="font-semibold">VATSIM Details (Verified)</div>
                                <span class="badge badge-success">{cidMember.rating_short}</span>
                            </div>
                            <div class="grid gap-2 text-sm md:grid-cols-2">
                                <div><span class="text-base-content/70">Rating</span>: {cidMember.rating_long}</div>
                                <div><span class="text-base-content/70">Member ID</span>: {cidMember.id}</div>
                                {#if cidMember.region_id}<div><span class="text-base-content/70">Region ID</span>: {cidMember.region_id}</div>{/if}
                                {#if cidMember.division_id}<div><span class="text-base-content/70">Division ID</span>: {cidMember.division_id}</div>{/if}
                                {#if cidMember.subdivision_id}<div><span class="text-base-content/70">Subdivision ID</span>: {cidMember.subdivision_id}</div>{/if}
                                {#if cidMember.country}<div><span class="text-base-content/70">Country</span>: {cidMember.country}</div>{/if}
                                {#if cidMember.countystate}<div><span class="text-base-content/70">County/State</span>: {cidMember.countystate}</div>{/if}
                                {#if cidMember.pilotrating != null}<div><span class="text-base-content/70">Pilot Rating</span>: {cidMember.pilotrating}</div>{/if}
                            </div>
                        </div>
                    {/if}

                    <div class="form-control">
                        <label class="label" for="access_key"><span class="label-text">Access Key</span></label>
                        <div class="relative">
                            <input
                                name="access_key"
                                id="access_key"
                                type={showAccessKey ? 'text' : 'password'}
                                class="input input-bordered w-full pr-12"
                                required
                            />
                            <button
                                type="button"
                                class="btn btn-ghost btn-sm btn-square absolute right-1 top-1/2 -translate-y-1/2"
                                on:click={() => (showAccessKey = !showAccessKey)}
                                title={showAccessKey ? 'Hide access key' : 'Show access key'}
                            >
                                {#if showAccessKey}
                                    <EyeOff size={18} />
                                {:else}
                                    <Eye size={18} />
                                {/if}
                            </button>
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label cursor-pointer justify-start gap-4">
                            <input type="checkbox" name="is_staff" class="checkbox checkbox-primary" bind:checked={isStaffChecked} on:change={() => (positionValue = (data?.profile?.position as string) || '')} />
                            <span class="label-text font-medium">I am a Staff member or Coordinator</span>
                        </label>
                    </div>
                    {#if isStaffChecked}
                        <div class="form-control">
                            <label class="label" for="position"><span class="label-text">Staff Position</span></label>
                            <input type="text" name="position" id="position" placeholder="e.g. Events Coordinator" class="input input-bordered w-full" bind:value={positionValue} required />
                        </div>
                    {/if}

						<div class="form-control rounded-lg border border-base-300 p-4">
							<label class="label cursor-pointer items-start gap-4">
								<input type="checkbox" name="terms" class="checkbox checkbox-primary mt-1" bind:checked={termsAccepted} required />
								<div class="flex flex-col">
									<span class="label-text font-medium">I accept the <a href="/terms-of-service" class="link link-primary" target="_blank">Terms of Service</a>, <a href="/privacy" class="link link-primary" target="_blank">Privacy Policy</a>, and <a href="/terms-of-use" class="link link-primary" target="_blank">Terms of Use</a>.</span>
									<span class="label-text-alt mt-1 text-base-content/60">
										By checking this box, you agree to our policies regarding data usage and community standards.
									</span>
								</div>
							</label>
						</div>

						<button
                            type="submit"
                            class="btn ermc-state-btn {submitState === 'success' ? 'ermc-success-btn' : submitState === 'error' ? 'btn-error' : 'btn-primary'} btn-lg mt-4 w-full"
                            disabled={submitState === 'loading' || submitState === 'success'}
                        >
                            {#if submitState === 'loading'}
                                <span class="loader" style="transform: scale(0.5); transform-origin: center;"></span>
                            {:else if submitState === 'success'}
                                <span class="ermc-icon-slide-in"><Check size={24} /></span>
                            {:else if submitState === 'error'}
                                <X size={24} />
                            {:else}
                                <Check size={24} /> Complete Registration
                            {/if}
                        </button>

                        <button
                            type="button"
                            class="btn ermc-state-btn w-full mt-2 {cancelState === 'success' ? 'ermc-success-btn' : cancelState === 'error' ? 'btn-error' : 'btn-ghost'}"
                            disabled={cancelState === 'loading' || cancelState === 'success' || submitState === 'loading'}
                            on:click={handleCancelRegistration}
                        >
                            {#if cancelState === 'loading'}
                                <span class="loader" style="transform: scale(0.5); transform-origin: center;"></span>
                            {:else if cancelState === 'success'}
                                <span class="ermc-icon-slide-in"><Check size={24} /></span>
                            {:else if cancelState === 'error'}
                                <X size={24} />
                            {:else}
                                Cancel registration
                            {/if}
                        </button>
					</form>
                    <form method="POST" action="?/cancelRegistration" class="hidden" bind:this={cancelRegistrationForm} use:useEnhanceCancelRegistration></form>
				</div>
			</div>
		</div>
	</section>
</main>
