<script>import {page} from '$app/state';</script>
<svelte:head><title>{page.status} · Talazo Agritech</title></svelte:head>
<main style="max-width:700px;padding:70px 25px"><a href="/farmer/overview"><img src="/images/talazo-logo-cropped.png" alt="Talazo Agritech" style="width:220px"/></a><p class="eyebrow" style="margin-top:45px">{page.status} / TALAZO</p><h1>{page.status===404?'This page could not be found.':'This workspace is unavailable.'}</h1><p>{page.error?.message}</p><a class="secondary" href="/farmer/overview">Return to workspace →</a></main>
