# Arquitetura

Uma aplicação integrada e uma origem. Vinext entrega o HTML semântico e encaminha as rotas de API para H3. Omi mantém o estado do editor dentro de um Web Component, sem copiar estado de servidor para mocks. Babylon.js carrega dinamicamente após a primeira geometria confirmada e usa essa mesma malha para renderização.

O boot do bundle independente ocorre em useEffect, depois da hidratação da página, para evitar que React reconstrua a região do componente Omi. React não controla os filhos internos do Web Component. Não há frontend de produto React paralelo.

## Geometria

Percurso circular com ondulação radial e vertical. Uma elipse percorre esse caminho e gira conforme a torção. Todos os parâmetros são inteiros limitados por Valibot. As duas direções da grade se fecham por módulo, sem duplicar costuras. O servidor confere orientação pelo volume assinado e emite faces consistentes. Os testes verificam incidência de duas faces por aresta, orientação oposta e característica de Euler zero.

Área e volume são derivados das faces, não números decorativos. O OBJ usa os vértices e faces da revisão persistida, com índices baseados em 1. Acabamento não altera a malha.

## Persistência e concorrência

O banco guarda parâmetros, título, digest do token, revisão, visibilidade e datas; malhas não são duplicadas no banco. Leituras regeneram quando necessário e exportação usa o registro salvo. Atualizações usam WHERE id AND revision AND revision<30 AND expires_at. Um único UPDATE/INSERT é atômico; não há transação falsa no cliente. Uma disputa de edição ou visibilidade resulta em 409.

Token por recurso evita conta/senha sem fingir autenticação por seleção de usuário. A aba guarda apenas suas próprias credenciais no sessionStorage, com aviso; compartilhamento usa exclusivamente ID público. Sem token, editar, remover e publicar são recusados mesmo se o recurso for público.

O catálogo é conteúdo autoral. Não há API externa ou mocks remanescentes no fluxo final. A fotografia é editorial e o HDRI é iluminação; nenhum deles fornece dados de negócio.
