<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Check, KeyRound, LoaderCircle, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export let data: { returnTo: string };
	export let form: { message?: string } | null = null;

	let submitState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
	type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

	const useEnhanceVerify = (formEl: HTMLFormElement) => {
		if (!browser) return;
		const submit: SubmitFunction = () => {
			submitState = 'loading';
			return async ({ result, update }) => {
				if (result.type === 'redirect') {
					submitState = 'success';
					const location = (result as { location: string }).location;
					await new Promise((r) => setTimeout(r, 2000));
					await goto(location);
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
				<input id="access_key" name="access_key" type="password" class="input input-bordered w-full" required />
			</div>

			<button
				type="submit"
				class="btn w-full {submitState === 'success' ? 'btn-success' : submitState === 'error' ? 'btn-error' : 'btn-primary'}"
				disabled={submitState === 'loading' || submitState === 'success'}
			>
				{#if submitState === 'loading'}
					<LoaderCircle size={18} class="animate-spin" />
				{:else if submitState === 'success'}
					<Check size={18} />
				{:else if submitState === 'error'}
					<X size={18} />
				{:else}
					Verify
				{/if}
			</button>
		</form>
	</div>
</div>
