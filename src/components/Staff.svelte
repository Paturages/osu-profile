<script>
  import OsuRow from './OsuRow.svelte';
  export let staff;
  let title, description, date;
  $: title = staff.name + (staff.short ? ` (${staff.short})` : '');
  $: description = staff.description;
  $: date = staff.period;
</script>

<OsuRow {title} {description} {date}>
  <div class="content">
    {#if staff.stream}
      📺
    {/if}
    {#if staff.commentary}
      🎙️
    {/if}
    {#if staff.referee}
      👮
    {/if}
    {#if staff.mappool}
      🎶
    {/if}
    {#if staff.mapper}
      🎼
    {/if}
    {#if staff.host}
      👑
    {/if}
    {#if staff.extra}
      {staff.extra}
    {/if}
  </div>
</OsuRow>

<style>
  .content {
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
  }
</style>
