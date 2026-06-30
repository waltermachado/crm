# Debug Session: kanban-reorder

Status: [OPEN]

## Sintoma
- O arrastar e soltar dos cards continua sem funcionar corretamente, especialmente para trocar a posicao dentro da mesma coluna e possivelmente tambem entre colunas.

## Hipoteses
1. O `over.id` retornado pelo `dnd-kit` esta apontando para o container/coluna em vez do card alvo em alguns drops.
2. O `targetIndex` normalizado ainda fica incorreto quando a origem e o destino pertencem a mesma coluna.
3. O estado otimista atualiza localmente, mas `router.refresh()` restaura a ordem anterior por causa do snapshot vindo do servidor/demo-store.
4. A `moveDealAction()` persiste movimentos entre colunas, mas reordenacoes na mesma coluna nao atualizam `position` corretamente.
5. A estrategia de colisao `closestCorners` esta gerando alvo inconsistente no quadro.

## Evidencia
- Coleta `pre-fix` realizada com sucesso via `.dbg/trae-debug-log-kanban-reorder.ndjson`.
- Reproducao automatizada no navegador:
  - Reordenacao dentro da mesma coluna (`Novo Lead`): sucesso.
  - Movimento entre colunas (`Novo Lead` -> `Primeiro Contato`): sucesso.
- Linhas observadas:
  - `1-5`: `deal-demo-2` movido dentro de `stage-novo_lead`, com `sourceIndex=1` e `normalizedTargetIndex=0`; action demo retornou `nextPosition=0`.
  - `6-10`: `deal-demo-1` movido de `stage-novo_lead` para `stage-primeiro_contato`, com persistencia concluida e retorno `success`.

## Status das Hipoteses
1. `over.id` incorreto: nao confirmada pelos logs atuais.
2. `targetIndex` normalizado incorreto: nao confirmada pelos logs atuais.
3. `router.refresh()` revertendo ordenacao: nao reproduzido no teste automatizado atual.
4. Persistencia falhando na mesma coluna: nao confirmada no modo demo atual.
5. Colisao `closestCorners` escolhendo alvo errado: nao confirmada na reproducao atual.

## Proximo Passo
- Obter o passo a passo exato em que o usuario ainda observa a falha para reproduzir o mesmo fluxo manualmente.
