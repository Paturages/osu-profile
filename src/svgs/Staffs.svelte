<script>
	import Staff from '../components/Staff.svelte';
	export let staffs;
</script>

{#each staffs as staff}
  <Staff {staff} />
{/each}
