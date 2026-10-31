# Dependências de terceiros

Código próprio: MIT, Gustavo Paz. As licenças abaixo continuam pertencendo aos respectivos titulares; a licença do projeto não substitui seus termos. Verificação em 31/10/2026.

| Dependência | Versão instalada | Licença declarada no package.json | Texto preservado |
| --- | --- | --- | --- |
| Omi | 7.7.14 | MIT | [Omi-7.7.14-LICENSE](../vendor/Omi-7.7.14-LICENSE) |
| Babylon.js / @babylonjs/core | 9.33.1 | Apache-2.0 | [LICENSE](../vendor/BabylonJS-9.33.1-LICENSE.md) e [NOTICE completo](../vendor/BabylonJS-9.33.1-NOTICE.md) |
| H3 | 2.0.8 | MIT | [H3-2.0.8-LICENSE](../vendor/H3-2.0.8-LICENSE) |
| Valibot | 1.5.0 | MIT | [Valibot-1.5.0-LICENSE](../vendor/Valibot-1.5.0-LICENSE) |

Babylon.js, H3 e Valibot: textos copiados integralmente, byte a byte, dos pacotes instalados em node_modules. O NOTICE do Babylon.js foi preservado integralmente, inclusive seus avisos sobre componentes opcionais; isso não afirma que cada componente listado seja carregado pelo aplicativo.

## Origem do aviso Omi

O pacote npm Omi 7.7.14 declara MIT, mas não distribui um arquivo LICENSE/NOTICE em sua raiz. A listagem oficial de tags do repositório não forneceu a tag 7.7.14. Para evitar usar uma licença de versão diferente, o campo **gitHead** do registro npm da versão exata foi consultado: `047b6bf4f44e125b5ef1e677ff31786d1137c0e7`.

O texto integral foi obtido do [LICENSE desse commit no repositório oficial Tencent/omi](https://github.com/Tencent/omi/blob/047b6bf4f44e125b5ef1e677ff31786d1137c0e7/LICENSE), em 31/10/2026. Portanto, o arquivo é vinculado ao commit de publicação informado pelo npm, não à licença atual de main.

## Fontes e mídia

As licenças completas de Manrope e DM Mono estão preservadas em vendor. HDRI e fotografia têm licenças próprias descritas em [assets-license.md](assets-license.md) e metadados/hashes em [assets.json](assets.json). Nenhum material da Apple ou Rockstar foi redistribuído.

O lockfile registra as dependências e suas versões. Dependências transitivas e ferramentas de build mantêm as licenças distribuídas nos respectivos pacotes; esta relação destaca as bibliotecas solicitadas que participam diretamente dos bundles de produto.
