# Validação da solução integrada

## Automatizada

24 testes aprovados em Node.js contra o domínio e D1/SQLite real via Miniflare. Os testes verificam geometria determinística, incidência de duas faces por aresta, orientação consistente, característica de Euler zero, limites extremos, bounds e exportação OBJ. Integração cobre privacidade, digest de tokens, isolamento por recurso, CAS concorrente, visibilidade, expiração, cotas, limite de revisões e persistência após reabrir runtime.

TypeScript verifica a página, o frontend Omi e os tipos da interface. Prettier verifica o código de produto. O build compila primeiro o bundle Omi/Babylon e depois o Worker Vinext. CI reproduz npm ci, testes, tipos, formatação e build; os resultados remotos estão no [workflow](https://github.com/gustapaz/vertice-studio/actions).

## Navegador e conexão real

Interface real contra o Worker local e D1: mudar acabamento e dobras, ajustar torção por teclado, criar peça, reler do banco, publicar link e abrir em uma nova aba sem credencial de edição. O visitante recebeu o estado de leitura pública. Um servidor interrompido durante releitura produziu mensagem de conexão sem apagar o título ou parâmetros na tela. A retomada usa a ação de falha correspondente, sem trocar por mocks.

Desktop em viewport padrão. Responsividade em iframes locais com 390 e 768 pixels de largura e 844 de altura: contextos reais de CSS/viewport dentro do navegador, não emulação de hardware. A capacidade de alterar viewport da ferramenta não teve efeito; o harness local foi usado e removido da entrega. Larguras úteis de documento 375 e 753 por causa da barra vertical; scrollWidth igual a clientWidth em ambos. Controles de torção por teclado e pausa explícita foram usados no contexto estreito. Nenhum teste físico de aparelho foi alegado.

Semântica, foco visível, nomes dos controles, status acessível, landmarks, links e redução de movimento foram inspecionados. Não há nota inventada de Lighthouse, WCAG certificado, taxa de frames ou garantia de hardware. O fallback sem WebGL está implementado; não foi utilizado um dispositivo físico sem WebGL nesta validação.

## Peso e operação

Separação dinâmica do motor 3D. No build local, entrada Omi/app próxima de 16 KiB gzip; o motor e shaders são carregados sob demanda. HDRI local 1.615.248 bytes, foto editorial WebP 72.330 bytes, fontes locais e poster próprio. O palco limita DPR a 1,5 e evita renderização quando fora da área relevante ou com documento oculto. Não se afirma uma nota de desempenho baseada apenas em tamanho.

Smoke executável valida health+DB+geometria, catálogo, malha, criação privada, edição, conflito, publicação, leitura sem token, OBJ, retirada de visibilidade, HTML e documentação. Ele revoga somente o recurso sintético criado pelo próprio teste. A entrega final também confere URL pública, CI e autoria no GitHub.
