<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
</script>

<div class="flex h-screen flex-col items-center justify-center bg-base-300">
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body items-center text-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <h2 class="card-title mt-4">Connecting to Discord...</h2>
      <p>Please wait while we verify your authorization.</p>
    </div>
  </div>
</div>
