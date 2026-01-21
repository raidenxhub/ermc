<script lang="ts">
    import { browser } from '$app/environment';
    import { enhance } from '$app/forms';
    import { Send, Mail, Check, X } from 'lucide-svelte';
    import { toast } from 'svelte-sonner';

    export let form: { success?: boolean; error?: string } | null = null;

    let selectedSubject = '';
    let submitState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    type SubmitFunction = NonNullable<Parameters<typeof enhance>[1]>;

    const useEnhanceContact = (formEl: HTMLFormElement) => {
        if (!browser) return;
        const submit: SubmitFunction = () => {
            submitState = 'loading';
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    submitState = 'success';
                    toast.success('Thank you for reaching out, we will be in touch soon.');
                    const warning = (result as { data?: { warning?: string } })?.data?.warning;
                    if (warning) toast.warning(warning);
                    selectedSubject = '';
                    await update({ reset: true });
                    setTimeout(() => (submitState = 'idle'), 2000);
                    return;
                }

                await update();
                submitState = 'error';
                const message =
                    result.type === 'failure'
                        ? ((result.data as { error?: string })?.error || 'Failed to send message. Please try again later.')
                        : 'Failed to send message. Please try again later.';
                toast.error(message);
                setTimeout(() => (submitState = 'idle'), 2000);
            };
        };
        return enhance(formEl, submit);
    };
</script>

<main class="flex flex-col">
    <section class="min-h-dvh">
        <div class="container mx-auto px-4 pt-28 pb-16 md:pt-36">
            <div class="mx-auto w-full max-w-lg">
                <div class="mb-8 text-center">
                    <h1 class="text-4xl font-bold text-white md:text-5xl">Contact Us</h1>
                    <p class="mt-3 text-gray-300">
                        Have a question, inquiry, or partnership proposal? Send us a message and we'll get back to you.
                    </p>
                    <div class="mt-4 inline-flex items-center gap-2 text-sm text-gray-400 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                        <Mail size={16} />
                        <a href="mailto:ermc@realkenan.dev" class="hover:text-white transition-colors">ermc@realkenan.dev</a>
                    </div>
                </div>

                <div class="card w-full bg-base-100 shadow-xl">
                    <div class="card-body">
                        {#if form?.success}
                            <div role="alert" class="alert alert-success mb-4">
                                <Check size={18} />
                                <span>We&apos;ll get back to you soon.</span>
                            </div>
                        {:else if form?.error}
                            <div role="alert" class="alert alert-error mb-4">
                                <X size={18} />
                                <span>{form.error}</span>
                            </div>
                        {/if}
                        <form method="POST" use:useEnhanceContact class="space-y-4">
                            <div class="form-control">
                                <label class="label" for="name">
                                    <span class="label-text">Name</span>
                                </label>
                                <input id="name" type="text" name="name" placeholder="Your Name" class="input input-bordered" required />
                            </div>

                            <div class="form-control">
                                <label class="label" for="email">
                                    <span class="label-text">Email</span>
                                </label>
                                <input id="email" type="email" name="email" placeholder="email@example.com" class="input input-bordered" required />
                            </div>

                            <div class="form-control">
                                <label class="label" for="subject">
                                    <span class="label-text">Subject</span>
                                </label>
                                <select id="subject" name="subject" class="select select-bordered" bind:value={selectedSubject} required>
                                    <option value="" disabled selected>Select a subject</option>
                                    <option value="General Inquiry">General Inquiry</option>
                                    <option value="Partnership">Partnership Proposal</option>
                                    <option value="Support">Support</option>
                                    <option value="Other">Other</option>
                                </select>
                                {#if selectedSubject === 'Partnership'}
                                <div class="mt-2 text-xs text-info bg-info/10 p-2 rounded border border-info/20 mb-4">
                                    Note: We only partner with vACCs and subdivisions on VATSIM or other flight networks.
                                </div>

                                <div class="form-control">
                                    <label class="label" for="subdivision">
                                        <span class="label-text">Subdivision / vACC</span>
                                    </label>
                                    <input id="subdivision" type="text" name="subdivision" placeholder="e.g. Khaleej vACC" class="input input-bordered" required />
                                </div>

                                <div class="form-control">
                                    <label class="label" for="position">
                                        <span class="label-text">Your Position</span>
                                    </label>
                                    <input id="position" type="text" name="position" placeholder="e.g. Events Director" class="input input-bordered" required />
                                </div>

                                <div class="form-control">
                                    <label class="label" for="website">
                                        <span class="label-text">Website</span>
                                    </label>
                                    <input id="website" type="url" name="website" placeholder="https://..." class="input input-bordered" required />
                                </div>

                                <div class="form-control">
                                    <label class="label" for="discord">
                                        <span class="label-text">Discord Server Invite</span>
                                    </label>
                                    <input id="discord" type="url" name="discord" placeholder="https://discord.gg/..." class="input input-bordered" required />
                                </div>
                            {/if}
                            </div>

                            <div class="form-control">
                                <label class="label" for="message">
                                    <span class="label-text">Message</span>
                                </label>
                                <textarea id="message" name="message" class="textarea textarea-bordered h-32" placeholder="Your message..." required></textarea>
                            </div>

                            <div class="form-control mt-6">
                                <button
                                    class="btn ermc-state-btn {submitState === 'success' ? 'ermc-success-btn' : submitState === 'error' ? 'btn-error' : 'btn-primary'}"
                                    disabled={submitState === 'loading' || submitState === 'success'}
                                >
                                    {#if submitState === 'loading'}
                                        <span class="loader" style="transform: scale(0.375); transform-origin: center;"></span>
                                    {:else if submitState === 'success'}
                                        <span class="ermc-icon-slide-in"><Check size={18} /></span>
                                    {:else if submitState === 'error'}
                                        <X size={18} />
                                    {:else}
                                        <Send size={18} /> Send Message
                                    {/if}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </section>
</main>
