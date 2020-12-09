<script>
	import Dan from '../components/Dan.svelte';
	export let dans;
</script>

{#each dans as dan}
  <Dan {dan} />
{/each}
