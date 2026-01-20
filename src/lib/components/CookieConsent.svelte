<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  let show = false;

  onMount(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => show = true, 1000);
    }
  });

  function acceptAll() {
    localStorage.setItem('cookie-consent', 'all');
    show = false;
  }

  function acceptEssential() {
    localStorage.setItem('cookie-consent', 'essential');
    show = false;
  }
</script>

{#if show}
  <div transition:fly={{ y: 50, duration: 300 }} class="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
    <div class="container mx-auto max-w-4xl bg-base-100/95 backdrop-blur border border-base-300 shadow-2xl rounded-xl p-6 md:flex md:items-center md:justify-between md:gap-6">
      <div class="space-y-2 mb-4 md:mb-0 flex-1">
        <h3 class="font-bold text-lg">We value your privacy</h3>
        <p class="text-sm text-muted-foreground leading-relaxed">
          We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
          By clicking "Accept All", you consent to our use of cookies. 
          Read our <a href="/privacy" class="link link-primary">Privacy Policy</a> and <a href="/terms-of-use" class="link link-primary">Terms of Use</a> to learn more.
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-3 min-w-fit">
        <button class="btn btn-outline btn-sm" on:click={acceptEssential}>Essential Only</button>
        <button class="btn btn-primary btn-sm" on:click={acceptAll}>Accept All</button>
      </div>
    </div>
  </div>
{/if}
