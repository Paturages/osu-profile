<script>
	import Tournament from '../components/Tournament.svelte';
	export let tournaments;
</script>

{#each tournaments as tournament}
  <Tournament {tournament} />
{/each}
