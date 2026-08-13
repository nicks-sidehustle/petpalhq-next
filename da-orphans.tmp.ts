import { getAllGuides } from './src/lib/guides';
const norm=(v:string)=>v.toLowerCase().replace(/\s+/g,' ').trim();
const rows:string[]=[];
for (const g of getAllGuides()) {
  const sup=g.suppressedPicks??[]; if(!sup.length) continue;
  const survTok=new Set<string>();
  for (const p of g.picks??[]) for (const t of norm(p.name+' '+(p.brand??'')).split(/[^a-z0-9]+/)) if(t.length>=3) survTok.add(t);
  const entries: Array<[string,string]> = [];
  g.sources?.expert?.forEach((s,i)=>entries.push([`sources.expert[${i}]`,s]));
  g.sources?.community?.forEach((s,i)=>entries.push([`sources.community[${i}]`,s]));
  for (const [f,s] of entries) {
    const ns=norm(s);
    for (const sp of sup) {
      const needles=[sp.name, ...(sp.aliases??[])].filter(x=>x&&x.length>=6);
      const hit=needles.find(n=>ns.includes(norm(n)));
      // distinctive tokens of the suppressed pick that no surviving pick shares
      const distinct=norm(sp.name).split(/[^a-z0-9]+/).filter(t=>t.length>=4 && !survTok.has(t));
      const distinctHit=distinct.filter(t=>ns.includes(t));
      if (hit || distinctHit.length>=2) {
        // does the entry ALSO name a surviving pick? then it is shared provenance, not an orphan
        const sharesSurvivor=(g.picks??[]).some(p=>{
          const brand=norm(p.brand||p.name.split(/\s+/)[0]);
          return brand.length>=4 && ns.includes(brand);
        });
        rows.push(`${g.slug} | ${f} | ${sharesSurvivor?'SHARED':'ORPHAN'} | "${s.slice(0,95)}" | suppressed: ${sp.name.slice(0,32)}`);
        break;
      }
    }
  }
}
const orphans=rows.filter(r=>r.includes('| ORPHAN |'));
console.log(orphans.join('\n'));
console.log(`\nORPHANS ${orphans.length} across ${new Set(orphans.map(r=>r.split(' | ')[0])).size} guides | shared(left alone) ${rows.length-orphans.length}`);
