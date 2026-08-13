import fs from 'fs'; import path from 'path'; import matter from 'gray-matter';
const dir='src/content/guides';
const norm=(v:string)=>v.toLowerCase().replace(/\s+/g,' ').trim();
const pre=(a:string,b:string)=>{const n=Math.min(a.length,b.length);let i=0;while(i<n&&a[i]===b[i])i++;return i;};
const STOP=new Set(['the','and','for','with','pet','pets','cat','cats','dog','dogs','inch','inches','large','small','mini','kit','kits','set','sets','pack','size','sized','black','white','gallon','gal','lbs','oz']);
const tok=(v:string)=>new Set(v.split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOP.has(x)));
const shared=(a:Set<string>,b:Set<string>)=>{let n=0;for(const x of a)if(b.has(x))n++;return n;};
let total=0, resolved=0, none=0, ambiguous=0;
const unresolved:string[]=[];
for (const f of fs.readdirSync(dir).filter(x=>x.endsWith('.md'))) {
  const d:any = matter(fs.readFileSync(path.join(dir,f),'utf8')).data;
  const tps = Array.isArray(d.topPicks)?d.topPicks:[]; if(!tps.length) continue;
  const picks = Array.isArray(d.picks)?d.picks:[];
  for (const tp of tps) {
    total++;
    const t=norm(String(tp?.name??''));
    let best:{s:number;i:number}|null=null, tie=false;
    picks.forEach((p:any,i:number)=>{
      const rn=norm(String(p?.name??''));
      const c=t.includes(rn)||rn.includes(t);
      const s=c?Math.min(t.length,rn.length):pre(t,rn);
      if(s<12) return;
      if(!best||s>best.s){best={s,i};tie=false;} else if(s===best.s) tie=true;
    });
    if(!best){
      const tt=tok(t); let b2:{s:number;i:number}|null=null; let t2=false;
      picks.forEach((p:any,i:number)=>{ const s=shared(tt,tok(norm(String(p?.name??'')))); if(s<2)return;
        if(!b2||s>b2.s){b2={s,i};t2=false;} else if(s===b2.s) t2=true; });
      best=b2; tie=t2;
    }
    if(!best) { none++; unresolved.push(`NO-MATCH  ${f.replace('.md','')} :: ${tp?.name}`); }
    else if(tie) { ambiguous++; unresolved.push(`AMBIGUOUS ${f.replace('.md','')} :: ${tp?.name}`); }
    else resolved++;
  }
}
console.log(unresolved.join('\n'));
console.log(`\ntotal=${total} resolved=${resolved} no-match=${none} ambiguous=${ambiguous}`);
