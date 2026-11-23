<script lang="ts">
 let {name}:{name:string}=$props();
 const paths:Record<string,string>={
 overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 farms:'m3 7 6-3 6 3 6-3v16l-6 3-6-3-6 3V7Zm6-3v16m6-13v16',
 satellite:'m9 9 6 6m-9-3 6 6M4 5l3-3 5 5-3 3-5-5Zm10 12 3-3 5 5-3 3-5-5ZM4 14a6 6 0 0 1 6 6m-7-2a3 3 0 0 1 3 3m7-17 3 3 4-4',
 weather:'M8 4V2m-5 5L1 6m14 0 2-2M3 13a5 5 0 1 1 8-7m-2 14a5 5 0 1 1 0-10 7 7 0 0 1 13 4 3 3 0 0 1-1 6H9Z',
 health:'M20 3C8 2 3 7 4 14c1 7 13 8 16-11ZM5 20 15 9',
 pests:'M8 8h8v9a4 4 0 0 1-8 0V8Zm1 0V6a3 3 0 0 1 6 0v2M3 9l5 3m8 0 5-3M3 16h5m8 0h5M5 23l4-4m6 0 4 4m-7-11v8',
 weeds:'M12 22V9m0 6C4 15 3 10 3 7c7 0 9 4 9 8Zm0-4c0-6 4-9 9-9 0 6-3 9-9 9Z',
 nutrients:'M9 3h6m-5 0v6l-6 11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1L14 9V3M7 15h10m-7 3h1m3-1h1',
 irrigation:'M12 2C8 9 4 12 4 16a8 8 0 0 0 16 0c0-4-4-7-8-14ZM8 16a4 4 0 0 0 4 4',
 yield:'M3 21h18M6 17v-5m6 5V8m6 9V3m-14 6 6-5 5 1 6-4',
 soil:'m12 2 10 6-10 6L2 8l10-6ZM2 13l10 6 10-6M2 18l10 6 10-6',
 analysis:'M8 3h9l4 4v14H8V3Zm9 0v5h4M3 8v13m9-4v-4m4 4v-6',
 account:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3',
 users:'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM3 21v-2a7 7 0 0 1 14 0v2m0-17a4 4 0 0 1 0 8m3 3a6 6 0 0 1 3 5',
 quota:'M3 7h18v14H3V7Zm3 0V3h12v4M3 12h18M8 16h3m3 0h2',
 requests:'M7 3h10v3H7V3Zm0 1H4v18h16V4h-3m-9 9 3 3 6-6',
 operations:'M3 12h4l3-8 4 16 3-8h4',
 support:'M4 13v-1a8 8 0 0 1 16 0v4a4 4 0 0 1-4 4h-4M4 12h3v6H4zm13 0h3v6h-3z',
 impact:'M3 20h18M6 16v-4m6 4V9m6 7V5M4 9l6-5 4 2 6-4',
 crops:'M3 21h18M6 17v-4m6 4v-7m6 7V5M4 8c3 0 5 1 5 4M12 7c0-4 3-5 6-5',
 switch:'M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4',
 logout:'M10 3H4v18h6m4-14 5 5-5 5m-5-5h12',
 lock:'M6 10h12v11H6V10Zm3 0V6a3 3 0 0 1 6 0v4'
 };
</script>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name]||paths.overview}/></svg>
<style>svg{display:block;width:20px;height:20px;flex-shrink:0}</style>
