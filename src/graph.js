import rows from './data.json';
export const courses = [
  { name: 'Licenciatura diurna', code: 'IB01-L', version: '2012/1', color: '#b57926' },
  { name: 'Licenciatura noturna', code: 'IB15', version: '2012/1', color: '#7866b0' },
  { name: 'Bacharelado integral', code: 'IB01-B', version: '2026-1', color: '#27857c' }
];
export const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const nodes = [];
export const sections = [];
export const groups = [];
for (let course = 0; course < courses.length; course++) {
  const x = course * 990;
  let y = 100;
  const own = rows.filter(r => r.course === course);
  const periods = [...new Set(own.map(r => r.period ?? 99))].sort((a,b) => a-b);
  for (const period of periods) {
    const bucket = own.filter(r => (r.period ?? 99) === period).sort((a,b) => a.code.localeCompare(b.code));
    sections.push({course, x:x+20, y, title:period===99?'Sem período atribuído':`${period}º período · ${period%2?'ímpar':'par'}`});
    y += 42;
    bucket.forEach((r,i) => nodes.push({...r,id:`${course}-${r.code}`,x:x+20+(i%3)*310,y:y+Math.floor(i/3)*150}));
    y += Math.ceil(bucket.length/3)*150+40;
  }
  groups.push({...courses[course],course,x,y:0,width:950,height:y});
}
export const byId = Object.fromEntries(nodes.map(n=>[n.id,n]));
export const width = 2970;
export const height = Math.max(...groups.map(g=>g.height));
export function blocks(node) {
  const result = {};
  for(const r of node.req) (result[r.block]??=[]).push(r.code);
  return result;
}
// Completa os requisitos do bloco escolhido; não confunde uma cadeia com todos os requisitos.
// Não cria equivalência entre cursos: cada ocorrência preserva seu currículo de origem.
export function trace(destinations, choices = {}) {
  const ids = new Set(), edges = [], seenEdges = new Set();
  function visit(id) {
    if(ids.has(id) || !byId[id]) return;
    ids.add(id);
    const node=byId[id], groups=blocks(node), keys=Object.keys(groups);
    const selected=String(choices[id] ?? keys[0]);
    for(const code of groups[selected] ?? []) {
      const from=`${node.course}-${code}`, key=`${from}>${id}`;
      if(!seenEdges.has(key)) {edges.push({from,to:id,block:selected});seenEdges.add(key);}
      visit(from);
    }
  }
  destinations.forEach(visit);
  return {ids, edges};
}

// Inclui ocorrências de cada código do percurso nas outras grades.
// As ligações de correspondência nunca entram na árvore de pré-requisitos.
export function relatedOccurrences(route) {
  const ids = new Set(route.ids), links = [];
  const codes = new Set([...route.ids].map(id => byId[id].code));
  for (const code of codes) {
    const matches = nodes.filter(n => n.code === code);
    const anchor = matches.find(n => route.ids.has(n.id));
    for (const other of matches) {
      ids.add(other.id);
      if (other.id !== anchor.id) links.push({ from: anchor.id, to: other.id, code });
    }
  }
  return { ids, links };
}
