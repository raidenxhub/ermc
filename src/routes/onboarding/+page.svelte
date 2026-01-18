<script lang="ts">
    import { enhance } from '$app/forms';
    import { UserPlus, Check } from 'lucide-svelte';
    import bgImage from '$lib/assets/images/bg.png?enhanced';

    export let form;
    export let data;
</script>

<main class="flex flex-col min-h-screen">
	<section class="relative isolate flex-grow bg-cover bg-center bg-no-repeat" style="background-image: url({bgImage});">
		<enhanced:img src={bgImage} alt="" class="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
		<div class="absolute inset-0 -z-10 bg-black/60"></div>

		<div class="container mx-auto flex items-center justify-center py-20">
			<div class="card w-full max-w-2xl bg-base-100/90 shadow-xl backdrop-blur-sm">
				<div class="card-body">
					<div class="flex flex-col items-center gap-4 text-center">
						<div class="rounded-full bg-primary/10 p-4 text-primary">
							<UserPlus size={48} />
						</div>
						<h1 class="text-3xl font-bold">Complete Your Profile</h1>
						<p class="text-base-content/70">Welcome to ERMC. We will use your Discord account details to set up your profile.</p>
					</div>

					<div class="divider"></div>

                    {#if form?.message}
                        <div role="alert" class="alert alert-error">
                            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{form.message}</span>
                        </div>
                    {/if}

					<form method="POST" use:enhance class="flex flex-col gap-6">
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
                            <label class="label" for="full_name"><span class="label-text">Full Name</span></label>
                            <input name="full_name" id="full_name" type="text" placeholder="e.g. John Doe" class="input input-bordered w-full" required />
                        </div>
                        <div>
                            <label class="label" for="cid"><span class="label-text">VATSIM CID</span></label>
                            <input name="cid" id="cid" type="text" placeholder="e.g. 1000000" class="input input-bordered w-full" required />
                        </div>
                        <div>
                            <label class="label" for="rating"><span class="label-text">VATSIM Rating</span></label>
                            <select name="rating" id="rating" class="select select-bordered w-full" required>
                                <option value="" disabled selected>Select Rating</option>
                                <option value="1">Observer (OBS)</option>
                                <option value="2">Student 1 (S1)</option>
                                <option value="3">Student 2 (S2)</option>
                                <option value="4">Senior Student (S3)</option>
                                <option value="5">Controller 1 (C1)</option>
                                <option value="7">Senior Controller (C3)</option>
                                <option value="8">Instructor 1 (I1)</option>
                                <option value="10">Senior Instructor (I3)</option>
                                <option value="11">Supervisor (SUP)</option>
                                <option value="12">Administrator (ADM)</option>
                            </select>
                        </div>
                        <div>
                            <label class="label" for="subdivision"><span class="label-text">Subdivision</span></label>
                            <input name="subdivision" id="subdivision" type="text" placeholder="e.g. Khaleej vACC" class="input input-bordered w-full" required />
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label cursor-pointer justify-start gap-4">
                            <input type="checkbox" name="is_staff" class="checkbox checkbox-primary" />
                            <span class="label-text font-medium">I am a Staff member or Coordinator</span>
                        </label>
                    </div>
                    <div class="form-control">
                        <label class="label" for="position"><span class="label-text">Staff Position (optional)</span></label>
                        <input type="text" name="position" id="position" placeholder="e.g. Events Coordinator" class="input input-bordered w-full" />
                    </div>

						<div class="form-control rounded-lg border border-base-300 p-4">
							<label class="label cursor-pointer items-start gap-4">
								<input type="checkbox" name="terms" class="checkbox checkbox-primary mt-1" required />
								<div class="flex flex-col">
									<span class="label-text font-medium">I accept the Terms of Service, Privacy Policy, and Terms of Use.</span>
									<span class="label-text-alt mt-1 text-base-content/60">
										By checking this box, you agree to our policies regarding data usage and community standards.
									</span>
								</div>
							</label>
						</div>

						<button type="submit" class="btn btn-primary btn-lg mt-4 w-full">
							<Check size={24} /> Complete Registration
						</button>
					</form>
				</div>
			</div>
		</div>
	</section>
</main>
