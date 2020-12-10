<script>
  import OsuRow from './OsuRow.svelte';
  export let dan;
  let title, description, date;
  $: title = dan.name;
  $: description = dan.grade;
  $: date = dan.date;
</script>

<OsuRow {title} {description} {date}>
  <div class="percent">
    {dan.percent || 'clear!'}
  </div>
  {#if dan.v2}
    <div class="v2">(v2)</div>
  {/if}
</OsuRow>

<style>
  .percent {
    font-weight: bold;
  }
</style>
