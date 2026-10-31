# VÉRTICE · contrato integrado

Modo integrado: portfolio-orchestrator coordena frontend-portfolio e backend-portfolio. Um repositório, uma origem HTTPS, publicação gratuita Sites/Workers/D1, sem cartão, trial ou faturamento. A camada Vinext serve HTML semântico e a API; o produto interativo usa Omi + Babylon.js, compilado separadamente.

## Produto e conclusão

Ateliê de esculturas digitais paramétricas. Entrar pela narrativa 3D, escolher uma forma de partida, modificar dobras/torção/tensão/acabamento, receber geometria calculada no servidor, salvar peça privada, reabrir, editar com revisão, criar link público somente leitura e exportar OBJ real. A aplicação não vende, fabrica, encomenda ou alega viabilidade física. Sem integrações de terceiros no fluxo principal.

Dados de catálogo e presets são curatoriais, autorais e sintéticos. Cálculo geométrico, validação, autorização, revisões e banco são reais. Não existe fallback silencioso para banco local. Um poster pré-renderizado da peça inicial cobre carregamento e ausência de WebGL, sem fingir ser uma consulta salva. Todas as operações continuam em HTML sem WebGL.

## Dados e operações

Schema canônico em server/domain.mjs (Valibot). Parâmetros inteiros: folds 3–9, torsion 0–4, tension 0–100; finish chrome/copper/ceramic. Malhas em unidades artísticas, sem unidade física ou promessa de fabricação. Resolução fixa, geração determinística; estatísticas: vértices, triângulos, área, volume absoluto orientado e bounds. Exportação OBJ em texto, sem execução de arquivos externos.

- GET /api/catalog: três presets e limites.
- POST /api/mesh: {params}; responde {params,positions,indices,stats}. Sem armazenamento.
- POST /api/pieces: {params,title} com título 1–48 caracteres; cria {piece,token}. Token 256 bits, digest no banco, expira em 7 dias; rascunho inicialmente privado. Máximo 12 criações/hora UTC globalmente.
- GET /api/pieces/:id: público somente se published=true, senão Bearer do recurso. Falta de permissão é 404; um token não acessa outra peça.
- PUT /api/pieces/:id: Bearer + {params,title,expected_revision}; atualização otimista, 409 se revisão divergente. Máximo 30 revisões. Conteúdo antigo da edição pública muda somente se o proprietário decidir atualizar a própria peça publicada; interface avisa.
- POST /api/pieces/:id/publish: Bearer + {expected_revision,published:boolean}; troca visibilidade com CAS e nova revisão. Link /?piece=:id nunca contém token.
- DELETE /api/pieces/:id: Bearer; revoga e remove apenas a própria peça.
- GET /api/pieces/:id/mesh.obj: mesma autorização da leitura. Geometria gerada no servidor a partir do registro.
- GET /api/health; GET /api/openapi.json.

Erros JSON {code,message,request_id}; 400 JSON/UTF8, 403 origem, 404 recurso/permissão, 409 revisão, 413 bytes, 415 mídia, 422 schema, 429 cota, 500 mascarado. Até 16 KiB por corpo. Sem CORS aberto, cookies ou corpo em logs. Tokens nunca em URL. Só credenciais do próprio ateliê ficam em sessionStorage, com aviso; fechar aba encerra acesso local. Link público não recupera edição. Backend exige autorização mesmo se cliente for adulterado.

## Persistência, estados e publicação

D1 durável, migrações Drizzle geradas e inspecionadas antes de aplicar; nunca modificar migrações aplicadas. Banco de testes Miniflare isolado. Sem senhas reais. TTL de 7 dias, limpeza física oportunística. A interface distingue carregando, calculando, erro de rede com retentar, validação, não encontrado, salvo, conflito e sucesso de publicação. Alterar controles marca resultado anterior como desatualizado; nunca salvar parâmetros diferentes da prévia confirmada.

Executar: npm ci; npm test; npm run build; npm run db:migrate; npm start -- --port 5240. Front Omi gerado em public/atelier, depois Worker Vinext. Mesma origem para evitar configuração de CORS. Sem chamadas de imagens/fontes externas em runtime.

## Critérios conjuntos

Verificar malha fechada por incidência de arestas e orientação, bounds finitos, geração determinística, catálogo e limites; autorização, atualização concorrente, mudança de visibilidade, TTL, reabertura do banco e exportação OBJ. Pelo navegador: alterar forma, salvar, reler, compartilhar e abrir link público, responder a falha real de API, desktop/mobile, teclado e movimento reduzido. Medir assets e desempenho sem inventar notas de auditoria.
