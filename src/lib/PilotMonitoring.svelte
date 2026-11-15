<script>
 let {section='overview'}=$props();
</script>

<section class="pilot-intro">
 <p class="eyebrow">YOUR FARM / SATELLITE-FIRST PILOT</p>
 <h2>{section==='imagery'?'A wider view of your fields.':section==='monitoring'?'Two sources. Clear context.':section==='nodes'?'Measurements from the ground.':'Start with your land.'}</h2>
 <p>Map your growing areas, review satellite observations, and add soil sensors as your monitoring grows.</p>
</section>
<section class="panel pilot-steps" aria-label="Farm setup steps">
 <div><span class="step-number">01</span><h3>Define your farm</h3><p>Record the location and draw the land boundary. A location pin alone does not define the monitored area.</p><a class="text-link" href="/farmer/fields">Review fields &amp; zones →</a></div>
 <div><span class="step-number">02</span><h3>Describe each zone</h3><p>Record soil, irrigation, drainage and the current crop season for each management area.</p></div>
 <div><span class="step-number">03</span><h3>Connect observations</h3><p>Satellite registration will be available after the provider integration is tested. Soil devices can follow.</p></div>
</section>
<div class="pilot-sources">
 <section class="panel">
  <div class="panel-heading"><div><p class="eyebrow">SATELLITE / AREA COVERAGE</p><h2>Field observations</h2></div><span class="tag">Not connected</span></div>
  <div class="satellite-placeholder" aria-label="Satellite imagery is unavailable"><span aria-hidden="true">◎</span><h3>No satellite observations yet</h3><p>CropSense is not connected. No imagery, vegetation scores or moisture indices have been retrieved.</p></div>
  <dl class="source-facts"><div><dt>Latest usable capture</dt><dd>Unavailable</dd></div><div><dt>Cloud-free coverage</dt><dd>Unavailable</dd></div><div><dt>Provider synchronization</dt><dd>Not started</dd></div></dl>
  <p class="source-note">Observations will show their capture date, source and usable coverage. Cloudy or undersized areas may not support a reliable result.</p>
 </section>
 <section class="panel">
  <div class="panel-heading"><div><p class="eyebrow">HARDWARE / SENSOR LOCATION</p><h2>Soil measurements</h2></div><span class="tag">Not connected</span></div>
  <div class="sensor-values"><div><span>Soil moisture</span><strong>—</strong><small>Unit and calibration to be confirmed</small></div><div><span>Soil temperature</span><strong>— <small>°C</small></strong></div><div><span>Electrical conductivity</span><strong>— <small>mS/cm</small></strong></div></div>
  <p>No hardware API is connected to this workspace. Device assignment and synchronization will become available in the hardware phase.</p>
  <p class="source-note">Sensors measure at their installed location and depth. Satellite moisture-related indices are separate measurements and will not be displayed as soil moisture percentages.</p>
 </section>
</div>
<style>
 .pilot-intro{max-width:720px;margin:10px 0 26px}.pilot-intro h2{font-size:clamp(28px,4vw,42px);line-height:1.12;margin:10px 0 14px}.pilot-intro>p:last-child{color:var(--muted,#657168);line-height:1.7}
 .pilot-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px;margin-bottom:24px}.pilot-steps h3{margin:12px 0 8px}.pilot-steps p,.pilot-sources p{line-height:1.65}.step-number{font-size:13px;font-weight:700;color:#426338}
 .pilot-sources{display:grid;grid-template-columns:1.15fr 1fr;gap:24px}.pilot-sources .panel{min-width:0}.satellite-placeholder{padding:35px 24px;background:#edf1e8;border:1px dashed #a4b79b;border-radius:12px;text-align:center;margin:20px 0}.satellite-placeholder>span{font-size:42px;color:#426338}.satellite-placeholder p{max-width:410px;margin:0 auto}.source-facts{margin:20px 0}.source-facts>div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #e3e8df}.source-facts dt{color:#59665a}.source-facts dd{margin:0;font-weight:600}.source-note{font-size:13px;color:#59665a;border-top:1px solid #e3e8df;padding-top:16px}.sensor-values{display:grid;gap:16px;margin:24px 0}.sensor-values>div{display:grid;gap:5px}.sensor-values strong{font-size:30px}.sensor-values small{font-size:12px;font-weight:400;color:#59665a}
 @media(max-width:900px){.pilot-sources{grid-template-columns:1fr}.pilot-steps{gap:18px}}@media(max-width:600px){.pilot-steps{grid-template-columns:1fr}.source-facts>div{flex-direction:column;gap:4px}}
</style>
