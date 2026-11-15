<script lang="ts">
 import BoundaryMap from './BoundaryMap.svelte';
 let {boundary,label='View field on Google Maps'}:{boundary:any,label?:string}=$props();
 let open=$state(false);
</script>
<details bind:open class="field-map-review"><summary>{label}</summary>{#if open}<BoundaryMap value={JSON.stringify(boundary)} editable={false}/>{/if}</details>
<style>.field-map-review{margin:18px 0;max-width:100%;min-width:0}.field-map-review summary{font-size:12px;font-weight:600;cursor:pointer;padding:8px 0;color:#24503b}.field-map-review summary:focus-visible{outline:2px solid #b77d17;outline-offset:3px}.field-map-review[open]{min-width:min(100%,400px)}</style>
