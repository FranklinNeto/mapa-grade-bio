<script>
  import { tick } from 'svelte';
  import { nodes, byId, courses, groups, sections, width, height, normalize, blocks, trace, relatedOccurrences } from './graph.js';
  let stage;
  let x = $state(30), y = $state(30), zoom = $state(.64);
  let query = $state(''), courseFilter = $state('all');
  let selected = $state(null), destinations = $state([]), choices = $state({});
  let routeOnly = $state(false), showHelp = $state(false), feedback = $state('');
  const node = $derived(byId[selected]);
  const route = $derived(trace(destinations, choices));
  let includeOtherGrades = $state(true);
  const related = $derived(relatedOccurrences(route));
  const highlightedIds = $derived(includeOtherGrades ? related.ids : route.ids);
  const extraCount = $derived(related.ids.size - route.ids.size);
  const active = $derived(destinations.length > 0);
  const searchResults = $derived(query.trim() ? nodes.filter(n => (courseFilter === 'all' || n.course === +courseFilter) && normalize(n.code+' '+n.name).includes(normalize(query.trim()))).slice(0,40) : []);
  const alternatives = $derived(nodes.filter(n=>route.ids.has(n.id) && Object.keys(blocks(n)).length>1));
  const visibleNodes = $derived(nodes.filter(n => (courseFilter==='all'||n.course===+courseFilter) && (!routeOnly || !active || highlightedIds.has(n.id))));
  const visibleIds = $derived(new Set(visibleNodes.map(n=>n.id)));
  const edges = $derived(route.edges.filter(e=>visibleIds.has(e.from)&&visibleIds.has(e.to)));
  const correspondenceLinks = $derived(includeOtherGrades ? related.links.filter(e=>visibleIds.has(e.from)&&visibleIds.has(e.to)) : []);
  const occurrences = $derived(node ? nodes.filter(n=>n.code===node.code) : []);

  function bounds(){ return stage?.getBoundingClientRect() ?? {width:900,height:600,left:0,top:0}; }
  function fit(items) {
    if(!items.length) return;
    const b=bounds(), left=Math.min(...items.map(n=>n.x)), top=Math.min(...items.map(n=>n.y));
    const right=Math.max(...items.map(n=>n.x+280)), bottom=Math.max(...items.map(n=>n.y+124));
    const marginLeft=active && b.width>700 ? 350 : 30;
    const marginTop=active && b.width<=700 ? 180 : 30;
    const availableWidth=Math.max(180,b.width-marginLeft-30), availableHeight=Math.max(150,b.height-marginTop-60);
    zoom=Math.max(.08,Math.min(1.1,availableWidth/(right-left),availableHeight/(bottom-top)));
    x=marginLeft+availableWidth/2-(left+right)/2*zoom; y=marginTop+availableHeight/2-(top+bottom)/2*zoom;
  }
  function fitRoute(){ selected=null; if(includeOtherGrades || destinations.some(id=>courseFilter!=='all' && byId[id].course!==+courseFilter))courseFilter='all'; fit(nodes.filter(n=>highlightedIds.has(n.id))); }
  function center(id){
    const n=byId[id]; if(!n)return;
    if(courseFilter!=='all' && +courseFilter!==n.course) courseFilter=String(n.course);
    if(routeOnly && !highlightedIds.has(id)) routeOnly=false;
    const b=bounds(); zoom=Math.min(1.05,(b.width-48)/280); x=b.width/2-(n.x+140)*zoom; y=Math.min(b.height*.34,240)-(n.y+62)*zoom;
    selected=id; query='';
  }
  function scale(factor, px,py){
    const b=bounds(); px??=b.width/2; py??=b.height/2;
    const next=Math.max(.12,Math.min(1.8,zoom*factor)), ratio=next/zoom;
    x=px-(px-x)*ratio;y=py-(py-y)*ratio;zoom=next;
  }
  function wheel(e){e.preventDefault();const b=bounds();scale(Math.exp(-e.deltaY*.0015),e.clientX-b.left,e.clientY-b.top);}
  const pointers=new Map(); let moved=false,tapId=null,travel=0;
  function down(e){
    if(e.button!==0 && e.pointerType==='mouse')return;
    const b=bounds();pointers.set(e.pointerId,{x:e.clientX-b.left,y:e.clientY-b.top});
    if(pointers.size===1){moved=false;travel=0;tapId=e.target.closest('[data-node]')?.dataset.node??null;}else moved=true;
    stage.setPointerCapture(e.pointerId);
  }
  function move(e){
    if(!pointers.has(e.pointerId))return;
    const b=bounds(), before=[...pointers.values()], prev=pointers.get(e.pointerId), next={x:e.clientX-b.left,y:e.clientY-b.top};
    const dx=next.x-prev.x,dy=next.y-prev.y;
    travel+=Math.hypot(dx,dy); if(travel>5)moved=true;
    pointers.set(e.pointerId,next);
    if(pointers.size===1){x+=dx;y+=dy;}
    else {
      const after=[...pointers.values()],oldMid={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2};
      const newMid={x:(after[0].x+after[1].x)/2,y:(after[0].y+after[1].y)/2};
      const oldDist=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y),newDist=Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y);
      if(oldDist>1)scale(newDist/oldDist,oldMid.x,oldMid.y);
      x+=newMid.x-oldMid.x;y+=newMid.y-oldMid.y;
    }
  }
  function up(e){if(!pointers.has(e.pointerId))return;const open=!moved&&pointers.size===1&&tapId;pointers.delete(e.pointerId);if(open)selected=open;if(!pointers.size)tapId=null;}
  function cancel(e){pointers.delete(e.pointerId);moved=true;tapId=null;}
  function keyboard(e){
    if(e.target!==stage)return;
    const delta=70;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Escape'].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft')x+=delta;if(e.key==='ArrowRight')x-=delta;if(e.key==='ArrowUp')y+=delta;if(e.key==='ArrowDown')y-=delta;
    if(e.key==='+')scale(1.25);if(e.key==='-')scale(.8);if(e.key==='Escape')selected=null;
  }
  function buildRoute(){destinations=[selected];routeOnly=false;feedback='Pré-requisitos e ocorrências nas outras grades destacados.';fitRoute();}
  function pin(){if(includeOtherGrades)courseFilter='all';if(!destinations.includes(selected))destinations=[...destinations,selected];feedback='Destino adicionado. O mapa reúne os requisitos dos destinos fixados.';}
  function resetRoute(){destinations=[];choices={};routeOnly=false;feedback='Conexões ocultas.';}
  async function changeCourse(){selected=null;await tick();fit(nodes.filter(n=>courseFilter==='all'||n.course===+courseFilter));}
  function correspondencePath(edge) {
    const a=byId[edge.from], b=byId[edge.to], right=b.x>a.x;
    const sx=a.x+(right?280:0), sy=a.y+62, tx=b.x+(right?0:280), ty=b.y+62;
    const bend=Math.max(100,Math.abs(tx-sx)/2)*(right?1:-1);
    return `M${sx},${sy} C${sx+bend},${sy} ${tx-bend},${ty} ${tx},${ty}`;
  }
  function path(edge){const a=byId[edge.from],b=byId[edge.to];const sx=a.x+140,sy=a.y+124,tx=b.x+140,ty=b.y;return `M${sx},${sy} C${sx},${sy+65} ${tx},${ty-65} ${tx},${ty}`;}
</script>

<svelte:head><title>Atlas de disciplinas · Biologia UFAM</title><meta name="description" content="Quadro interativo das três grades de Ciências Biológicas da UFAM, com busca e percursos de pré-requisitos."/></svelte:head>
<div class="app">
  <header><div class="brand"><span class="brand-icon">✳</span><div><strong>Atlas de disciplinas</strong><span>CIÊNCIAS BIOLÓGICAS / UFAM</span></div></div><button class="quiet" onclick={()=>showHelp=!showHelp} aria-expanded={showHelp}>Como usar</button></header>
  <div class="toolbar">
    <div class="search"><label class="sr" for="query">Buscar disciplina</label><span aria-hidden="true">⌕</span><input id="query" bind:value={query} placeholder="Busque pelo nome ou código…" autocomplete="off"/>
    {#if query}<button class="clear" aria-label="Limpar busca" onclick={()=>query=''}>×</button>{/if}
    {#if query.trim()}<div class="results"><p>{searchResults.length===40?'Primeiros 40 resultados':searchResults.length+' resultados'}</p>{#each searchResults as result}<button onclick={()=>center(result.id)}><b>{result.code}</b><span>{result.name}</span><small>{courses[result.course].name} · {result.period?result.period+'º período':'sem período'}</small></button>{:else}<p>Nenhuma disciplina encontrada nestas grades.</p>{/each}</div>{/if}
    </div>
    <label class="sr" for="course">Grade</label><select id="course" bind:value={courseFilter} onchange={changeCourse}><option value="all">As três grades</option>{#each courses as c,i}<option value={String(i)}>{c.name}</option>{/each}</select>
    <button class="outline" onclick={()=>fit(visibleNodes)}>Ver grade inteira</button>
  </div>
  {#if showHelp}<section class="help"><button class="close" aria-label="Fechar ajuda" onclick={()=>showHelp=false}>×</button><h2>Explore como um mapa</h2><p>Arraste com um dedo. Use dois dedos para ampliar ou os botões + e −. Busque uma disciplina para ir até ela e toque em “Mostrar pré-requisitos”.</p><p>Os cartões estão agrupados por curso e período; dentro de cada período, por código. No zoom distante, aparecem apenas os códigos. Para reunir vários objetivos, use “Fixar como destino”.</p><p><b>Limites das fontes:</b> este protótipo contém as três grades anexadas, não todas as disciplinas da UFAM. Par/ímpar é a posição na grade, não oferta de turmas. Conexões não autorizam matrícula entre cursos.</p><p>Setas indicam requisito → disciplina. Por padrão, o percurso inclui também os cartões com os mesmos códigos nas outras grades, ligados por linhas pontilhadas. Esses cartões podem ter pré-requisitos diferentes: selecione um deles para visualizar o percurso de sua própria grade. Requisitos do mesmo bloco aparecem juntos. Quando existem blocos diferentes, escolha qual visualizar; a interpretação administrativa precisa ser confirmada no eCampus. As versões das licenciaturas são 2012/1; a do bacharelado é 2026-1.</p></section>{/if}
  <div class="workspace" class:detail-open={selected !== null}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Quadro com gestos e navegação por teclado, explicitamente rotulado.) -->
    <div class="canvas" bind:this={stage} role="application" aria-label="Quadro de disciplinas. Use as setas do teclado para navegar e mais ou menos para ampliar." tabindex="0" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={cancel} onwheel={wheel} onkeydown={keyboard}>
      <div class="world" class:compact={zoom<.48} class:tiny={zoom<.26} style={`width:${width}px;height:${height}px;transform:translate(${x}px,${y}px) scale(${zoom})`}>
        {#each groups.filter(g=>courseFilter==='all'||g.course===+courseFilter) as group}<div class="course-group" style={`left:${group.x}px;top:0;width:${group.width}px;height:${group.height}px;--course:${group.color}`}><span>{group.code} / {group.version}</span><h2>{group.name}</h2></div>{/each}
        {#each sections.filter(s=>courseFilter==='all'||s.course===+courseFilter) as section}<div class="section-label" style={`left:${section.x}px;top:${section.y}px`}>{section.title}</div>{/each}
        <svg class="edges" width={width} height={height} aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#147964"/></marker></defs>{#each correspondenceLinks as link}<path class="correspondence-edge" d={correspondencePath(link)} stroke="#647ca6" stroke-width="3" stroke-dasharray="9 7" fill="none"/>{/each}{#each edges as edge}<path d={path(edge)} stroke="#147964" stroke-width="3" fill="none" marker-end="url(#arrow)"/>{/each}</svg>
        {#each visibleNodes as n (n.id)}<button class="node" class:dim={active&&!highlightedIds.has(n.id)} class:related={includeOtherGrades&&related.ids.has(n.id)&&!route.ids.has(n.id)} class:in-route={route.ids.has(n.id)} class:selected={selected===n.id} class:destination={destinations.includes(n.id)} data-node={n.id} style={`left:${n.x}px;top:${n.y}px;--course:${courses[n.course].color}`} aria-label={`${n.code}, ${n.name}, ${courses[n.course].name}`} onclick={e=>{if(e.detail===0)center(n.id)}}><span class="node-top"><strong>{n.code}</strong><small>{destinations.includes(n.id)?'★ DESTINO':includeOtherGrades&&related.ids.has(n.id)&&!route.ids.has(n.id)?'OUTRA GRADE':n.period?n.period+'º · '+(n.period%2?'ÍMPAR':'PAR'):'SEM PERÍODO'}</small></span><span class="node-name">{n.name}</span><span class="node-bottom">{n.req.length?n.req.length+' requisito(s) registrado(s)':'Sem pré-requisito registrado'}</span></button>{/each}
      </div>
    </div>
    <div class="map-controls"><button aria-label="Aumentar zoom" onclick={()=>scale(1.3)}>+</button><span>{Math.round(zoom*100)}%</span><button aria-label="Diminuir zoom" onclick={()=>scale(1/1.3)}>−</button><button aria-label="Enquadrar percurso ou grade" title="Enquadrar" onclick={()=>active?fitRoute():fit(visibleNodes)}>⛶</button></div>
    {#if !active}<div class="hint">Arraste o quadro · toque para explorar<br><small>262 ocorrências · 154 códigos · 3 grades</small></div>{/if}
    {#if active}<aside class="route-panel"><div class="route-heading"><strong>Percurso de pré-requisitos</strong><button aria-label="Limpar percurso" onclick={resetRoute}>×</button></div><p>{route.ids.size} no percurso{includeOtherGrades ? ` + ${extraCount} em outras grades` : ''} · {route.edges.length} pré-requisitos</p><div class="destinations">{#each destinations as id}<button title="Remover destino" onclick={()=>{destinations=destinations.filter(d=>d!==id);if(!destinations.length)routeOnly=false}}>{byId[id].code} · {courses[byId[id].course].code} ×</button>{/each}</div><label class="cross-grade-toggle"><input type="checkbox" bind:checked={includeOtherGrades} onchange={()=>{if(includeOtherGrades)courseFilter='all';}}/> Incluir outras grades</label><div class="route-legend"><span><i class="solid-line"></i> Pré-requisito</span><span><i class="dashed-line"></i> Mesmo código</span></div><div class="route-actions"><button class="primary" onclick={fitRoute}>Enquadrar percurso</button><label><input type="checkbox" bind:checked={routeOnly}/> Só o percurso</label></div>{#if alternatives.length}<details><summary>Blocos de pré-requisitos ({alternatives.length})</summary><p>Visualize um bloco de cada vez. Confirme sua interpretação administrativa.</p>{#each alternatives as n}<label class="block-select">{n.code}<select value={String(choices[n.id]??Object.keys(blocks(n))[0])} onchange={e=>choices={...choices,[n.id]:e.currentTarget.value}}>{#each Object.entries(blocks(n)) as [b,codes]}<option value={b}>Bloco {b}: {codes.join(' + ')}</option>{/each}</select></label>{/each}</details>{/if}<small>Linha pontilhada: mesmo código em outra grade, sem equivalência automática. Para ver seus requisitos, selecione o cartão e peça seu percurso.</small></aside>{/if}
    {#if node}<aside class="details" aria-label="Detalhes da disciplina"><button class="close" aria-label="Fechar detalhes" onclick={()=>selected=null}>×</button><p class="eyebrow">{courses[node.course].name}</p><h2>{node.code}</h2><h3>{node.name}</h3><div class="badges"><span>{node.period?node.period+'º período · '+(node.period%2?'ÍMPAR':'PAR'):'Sem período atribuído'}</span><span>{node.category}</span></div><div class="detail-actions"><button class="primary" onclick={buildRoute}>Mostrar pré-requisitos</button><button class="outline" disabled={destinations.includes(selected)} onclick={pin}>{destinations.includes(selected)?'Destino fixado':'＋ Fixar como destino'}</button></div><section><h4>Requisitos registrados</h4>{#each Object.entries(blocks(node)) as [block,codes]}<p><b>Bloco {block}:</b> {codes.join(' + ')}</p>{:else}<p>Nenhum registrado nesta grade.</p>{/each}</section>{#if occurrences.length>1}<section><h4>Mesmo código em outras grades</h4>{#each occurrences.filter(n=>n.id!==selected) as other}<button class="occurrence" onclick={()=>center(other.id)}>{courses[other.course].name}<span>{other.period?other.period+'º período':'Sem período'} ↗</span></button>{/each}<small>A presença do mesmo código não garante vaga ou aproveitamento entre cursos.</small></section>{/if}<small>Fonte: {courses[node.course].code}, versão {courses[node.course].version}, PDF p. {node.page}. Documentos de 16/10/2026. Nomes preservados conforme os anexos.</small></aside>{/if}
  </div>
  <footer><span>Pré-requisitos curriculares · oferta de turmas não confirmada</span><button onclick={()=>showHelp=true}>Fontes e limites</button></footer>
  <span class="sr" role="status">{feedback}</span>
</div>

