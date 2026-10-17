# Atlas de disciplinas · Biologia UFAM

Quadro navegável em Svelte 5.57.2, em projeto separado do app de listagens.

## Executar

Requer Node.js 22.12+ ou versão atual compatível com Vite.

```sh
npm install
npm run dev
```

Abra o endereço exibido, normalmente http://127.0.0.1:5174/.

```sh
npm run build
npm run preview
```

## Explorar

- Arraste o quadro com mouse ou um dedo. Em telas de toque, pinça com dois dedos altera o zoom.
- Use + / −, a roda do mouse ou o botão de enquadrar.
- Pesquise nome ou código. A pesquisa ignora acentos e maiúsculas e mostra até 40 resultados por vez; refine o texto ou filtre a grade.
- Escolha um resultado para centralizar a disciplina e abrir seus detalhes.
- “Mostrar pré-requisitos” desenha a árvore completa de requisitos para o bloco visualizado, preservando os ramos conjuntos. O destino é destacado, e o restante do quadro fica discreto.
- “Fixar como destino” acrescenta mais um objetivo à união das árvores de pré-requisitos. Cada destino preserva as regras de seu próprio curso.
- “Só o percurso” oculta cartões externos ao percurso; “Enquadrar percurso” ajusta o zoom.
- Quando existem blocos distintos, o painel permite escolher o bloco de cada disciplina. O primeiro bloco é o padrão de visualização; não é uma recomendação acadêmica.
- O mesmo código em outros cursos pode ser consultado pelo painel. Essa troca abre a ocorrência naquela grade, sem criar uma equivalência de matrícula.
- Com o quadro focado, setas movem o mapa, + / − alteram o zoom. A busca e os cartões também aceitam teclado.

## Organização do código

- `src/data.json`: 262 ocorrências, 154 códigos, extraídos dos três PDFs originais.
- `src/graph.js`: agrupamento por curso/período, posição dos cartões e busca recursiva de pré-requisitos. Cada ID combina curso e código.
- `src/App.svelte`: busca, seleção, destinos, blocos, gestos e arestas SVG.
- `src/style.css`: visual, painel móvel e zoom semântico.

Os cartões são organizados por curso, período recomendado e código. Optativas/eletivas sem período ficam no grupo “Sem período atribuído”. Ao reduzir o zoom, nomes e detalhes desaparecem; os códigos permanecem. Aproximar restaura o conteúdo.

## Fontes e limites

Fontes: `IB01-L - Ciências Biológicas.pdf` (licenciatura diurna, versão 2012/1); `IB15 - Ciências Biológicas.pdf` (licenciatura noturna, versão 2012/1); `Bacharel em Ciências Biológicas.pdf` (IB01-B integral, versão 2026-1). Documentos emitidos em 16/10/2026. Cada detalhe informa a página física da fonte. Nomes truncados nos PDFs foram preservados. ENADE não é disciplina e foi excluído.

A base abrange somente esses três cursos, não toda a UFAM. Não inclui Astronomia ou outras grades não fornecidas. Paridade é curricular, não abertura real de turmas. Não calcula tempo até formar, horários, vagas, equivalências ou disponibilidade de matrícula entre cursos.

Requisitos no mesmo bloco são reunidos. Blocos diferentes são visualizáveis separadamente, com confirmação de interpretação administrativa necessária. Não são geradas combinações de matrículas entre currículos como se fossem automaticamente autorizadas.

Não há conta, servidor de dados ou serviço externo. Destinos e escolhas ficam apenas na sessão da página; recarregar limpa o estado. O quadro pode ser arrastado; a posição individual dos cartões é definida pelo agrupamento e não é editada manualmente.

## Verificações realizadas

Build de produção; 262 ocorrências e 154 códigos; todas as referências resolvidas na própria grade; sequência FEF012–IBB095; ramificações de Biologia Molecular; alternativas de blocos do TCC; união de destinos sem conexões inventadas entre cursos; busca e controles na interface; layout em largura de celular. Gestos de pinça estão implementados com Pointer Events e precisam de validação final em aparelho físico.

## Disciplinas do percurso em outras grades

Por padrão, “Incluir outras grades” destaca também todas as ocorrências dos códigos presentes no percurso. Linhas pontilhadas azuis identificam o mesmo código entre cursos; setas verdes continuam sendo exclusivamente pré-requisitos registrados na grade do destino. Cartões adicionais ficam azuis e indicam “OUTRA GRADE”.

O botão “Enquadrar percurso” abrange essas ocorrências, e “Só o percurso” também as preserva. Desmarcar “Incluir outras grades” volta à árvore original. Ao solicitar um percurso, a visualização retorna às três grades para não esconder as correspondências.

As ocorrências adicionais não têm seus requisitos automaticamente substituídos pelos de outro curso. Para consultar os requisitos de uma ocorrência de outra grade, selecione seu cartão e use “Mostrar pré-requisitos”, ou fixe-o como destino adicional.

Exemplo verificado: IBB620 da licenciatura diurna tem quatro cartões em sua árvore e seis ocorrências adicionais nas outras grades; IBB240 aparece nos três cursos. As seis correspondências pontilhadas não modificam as três arestas de pré-requisitos da árvore original.
