<script lang="ts">
    import { enhance } from '$app/forms';
    import { Sparkles, Send, Mail } from 'lucide-svelte';
    import bgImage from '$lib/assets/images/bg.png?enhanced';
    import { toast } from 'svelte-sonner';

    export let form;

    let selectedSubject = '';

    $: if (form?.success) {
        toast.success('Message sent successfully!');
    } else if (form?.error) {
        toast.error(form.error);
    }
</script>

<main class="flex flex-col">
    <section class="relative isolate min-h-dvh overflow-hidden bg-cover bg-center bg-no-repeat">
        <!-- Background Image -->
        <enhanced:img src={bgImage} alt="" class="absolute inset-0 -z-20 h-full w-full object-cover object-center" />

        <!-- Background Overlay -->
        <div class="absolute inset-0 -z-10 bg-black/70"></div>

        <div class="container mx-auto px-4 py-20">
            <div class="flex flex-col items-center justify-center min-h-[80vh]">
                <div class="flex items-center gap-2 mb-4">
                    <Sparkles class="h-8 w-8 text-white" />
                    <h1 class="text-4xl font-bold text-white md:text-5xl">Contact Us</h1>
                </div>
                <p class="max-w-lg text-gray-300 text-center mb-4">
                    Have a question, inquiry, or partnership proposal? Send us a message and we'll get back to you.
                </p>
                <div class="flex items-center gap-2 text-sm text-gray-400 mb-8 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                    <Mail size={16} />
                    <a href="mailto:ermc@realkenan.dev" class="hover:text-white transition-colors">ermc@realkenan.dev</a>
                </div>

                <div class="card w-full max-w-lg bg-base-100/90 backdrop-blur shadow-xl">
                    <div class="card-body">
                        <form method="POST" use:enhance class="space-y-4">
                            <div class="form-control">
                                <label class="label" for="name">
                                    <span class="label-text">Name</span>
                                </label>
                                <input type="text" name="name" placeholder="Your Name" class="input input-bordered" required />
                            </div>

                            <div class="form-control">
                                <label class="label" for="email">
                                    <span class="label-text">Email</span>
                                </label>
                                <input type="email" name="email" placeholder="email@example.com" class="input input-bordered" required />
                            </div>

                            <div class="form-control">
                                <label class="label" for="subject">
                                    <span class="label-text">Subject</span>
                                </label>
                                <select name="subject" class="select select-bordered" bind:value={selectedSubject} required>
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
                                    <input type="text" name="subdivision" placeholder="e.g. Khaleej vACC" class="input input-bordered" required />
                                </div>

                                <div class="form-control">
                                    <label class="label" for="position">
                                        <span class="label-text">Your Position</span>
                                    </label>
                                    <input type="text" name="position" placeholder="e.g. Events Director" class="input input-bordered" required />
                                </div>

                                <div class="form-control">
                                    <label class="label" for="website">
                                        <span class="label-text">Website</span>
                                    </label>
                                    <input type="url" name="website" placeholder="https://..." class="input input-bordered" required />
                                </div>

                                <div class="form-control">
                                    <label class="label" for="discord">
                                        <span class="label-text">Discord Server Invite</span>
                                    </label>
                                    <input type="url" name="discord" placeholder="https://discord.gg/..." class="input input-bordered" required />
                                </div>
                            {/if}

                            <div class="form-control">
                                <label class="label" for="message">
                                    <span class="label-text">Message</span>
                                </label>
                                <textarea name="message" class="textarea textarea-bordered h-32" placeholder="Your message..." required></textarea>
                            </div>

                            <div class="form-control mt-6">
                                <button class="btn btn-primary">
                                    <Send size={18} class="mr-2" /> Send Message
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bottom Gradient -->
        <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-base-300"></div>
    </section>
</main>
