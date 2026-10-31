# Proteções e limites

Valibot valida objetos estritos, tipos, faixas, números finitos e títulos. Corpos são lidos por stream com limite real de 16 KiB, UTF-8 estrito e application/json. Compressão não é aceita. Nenhum arquivo arbitrário é processado ou carregado.

Consultas parametrizadas, token por recurso, digest SHA-256 no banco e revisão otimista. Token aleatório de 256 bits, TTL de 7 dias; nunca em URL, HTML público, logs ou Git. A credencial de edição fica somente no sessionStorage da aba. Um XSS na mesma origem poderia acessar sessionStorage; por isso títulos são texto escapado, nunca innerHTML, não há scripts de terceiros e a interface não aceita rich text. Não envie dados pessoais reais.

Peças privadas e expiradas são 404 para não revelar existência. Publicar é explícito e reversível; atualizar uma peça publicada também atualiza sua leitura compartilhada, com aviso na interface. Exclusão só afeta o token autenticado. Não há endpoint global de reset.

Sem cookies, CORS aberto, tracking ou integração de contas. Origem de navegador diferente é recusada; isso não substitui autorização. Respostas de API no-store, nosniff, no-referrer e request ID. Erros internos mascarados; não se registram corpos, tokens ou títulos em logs de aplicação.

Cota de criação global é atômica (12/hora UTC), e cada peça limita 30 revisões. Malha e corpo têm resolução/tamanho limitados. Essas medidas não equivalem a rate limit distribuído, proteção DDoS ou certificação. Peças expiradas são removidas oportunisticamente; não se promete exclusão física imediata ao expirar.
