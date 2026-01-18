<script lang="ts">
  import bgImage from '$lib/assets/images/bg.png?enhanced';
</script>

<main class="flex flex-col">
  <section class="relative isolate min-h-[40dvh] bg-cover bg-center bg-no-repeat" style="background-image: url({bgImage});">
    <enhanced:img src={bgImage} alt="" class="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
    <div class="absolute inset-0 -z-10 bg-black/50"></div>
    <div class="container mx-auto">
      <div class="flex min-h-[40dvh] flex-col items-center justify-center">
        <h1 class="text-4xl font-bold text-secondary md:text-5xl">ERMC Coordination</h1>
        <p class="mt-2 max-w-2xl text-center">Centralized coordination tools for ERMC operations. Sign in to access scheduling and settings through your dashboard.</p>
      </div>
    </div>
    <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-base-300"></div>
  </section>

  <section class="bg-base-300 py-10">
    <div class="container mx-auto">
      <div class="rounded-xl border bg-card text-card-foreground shadow p-6">
        <p>Coming soon: coordination tools and utilities tailored for ERMC.</p>
      </div>
    </div>
  </section>
</main>
