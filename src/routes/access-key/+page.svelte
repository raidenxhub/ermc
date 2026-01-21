<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export let data: { returnTo: string };
	export let form: { message?: string } | null = null;

	let submitState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	let showAccessKey = false;
	type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

	const useEnhanceVerify = (formEl: HTMLFormElement) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			submitState = 'loading';
			return async ({ result, update }) => {
				if (result.type === 'redirect') {
					submitState = 'success';
					toast.success('Access key verified.');
					const location = (result as { location: string }).location;
					await new Promise((r) => setTimeout(r, 1100));
					window.location.replace(location);
					return;
				}

				await update({ reset: false });
				if (result.type === 'failure') {
					submitState = 'error';
					const message = (result.data as { message?: string })?.message || 'Invalid access key.';
					toast.error(message);
					setTimeout(() => (submitState = 'idle'), 2000);
					return;
				}

				submitState = 'idle';
			};
		};
		return enhance(formEl, submit);
	};
</script>

<div class="container mx-auto px-4 py-16 max-w-lg">
	<div class="rounded-xl border bg-card shadow-sm p-8 space-y-6">
		<div class="flex items-center gap-3">
			<div class="p-3 bg-primary/10 rounded-full text-primary">
				<KeyRound size={28} />
			</div>
			<div>
				<h1 class="text-2xl font-bold">We've detected a mishap in your access!</h1>
				<p class="text-sm text-muted-foreground">Enter the ERMC access key for your subdivision to continue.</p>
			</div>
		</div>

		{#if form?.message}
			<div role="alert" class="alert alert-error">
				<X size={18} />
				<span>{form.message}</span>
			</div>
		{/if}

		<form method="POST" class="space-y-4" use:useEnhanceVerify>
			<input type="hidden" name="returnTo" value={data.returnTo} />
			<div class="form-control">
				<label class="label" for="access_key"><span class="label-text">Access Key</span></label>
				<div class="relative">
					<input
						id="access_key"
						name="access_key"
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

			<button
				type="submit"
				class="btn ermc-state-btn w-full {submitState === 'success' ? 'ermc-success-btn' : submitState === 'error' ? 'btn-error' : 'btn-primary'}"
				disabled={submitState === 'loading' || submitState === 'success'}
			>
				{#if submitState === 'loading'}
					<span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
				{:else if submitState === 'success'}
					<span class="ermc-icon-slide-in"><Check size={18} /></span>
				{:else if submitState === 'error'}
					<X size={18} />
				{:else}
					Verify
				{/if}
			</button>
		</form>
	</div>
</div>
