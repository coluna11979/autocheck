# Entrega — Check-up Builder V1

Evolução do MVP do commit `e459a69`, a partir da `main` que já contém o merge `cca71dc`. Não há reconstrução do projeto nem substituição da precificação.

## Desenvolvido

- Cadastro manual de múltiplos veículos, validação Zod, placa única e identificação pendente quando faltam especificações.
- Catálogo inicial de seis sistemas, sete componentes e fonte demonstrativa identificada; contrato `VehicleDataProvider` sem implementação de consulta externa.
- Biblioteca com criação, edição, duplicação, arquivamento, regras de aplicabilidade, ordenação e campos obrigatórios. Publicações incrementais imutáveis e snapshots históricos.
- Cinco check-ups demonstrativos opcionais, separados dos modelos reais e adicionados sem substituir registros existentes.
- Execução por sistema com cinco resultados distintos, observações, medições, evidência descritiva, limitações, progresso salvo e encerramento validado.
- Motor determinístico de investigação de ruído na suspensão: perguntas, instruções, registro de medição, condição, hipóteses/testes de confirmação, correção de respostas, bloqueio de ciclos e saída inconclusiva.
- Adaptador que exige confirmação técnica/evidência, verifica veículo e evita duplicação antes de enviar ao laudo existente. Inclusão/exclusão manual e totais permanecem disponíveis.
- Laudos separados por veículo e restauração do laudo original, sem descartar o anterior durante a troca.
- Repositório substituível, storage versionado, migração incremental e rejeição de conteúdo inválido sem reinicializar chaves antigas.
- Navegação dark mode para os seis módulos e controles adequados a tablet.

## Validação

Os três testes originais passaram antes de qualquer modificação. A suíte expandida contém 16 testes de domínio/regressão e oito testes Playwright cobrindo o MVP, fluxo preventivo, histórico de versões, persistência, confirmação de achados, investigação/correção, modelos, armazenamento inválido e layout em 390/768/1440 px. Comandos reproduzíveis:

```sh
npm run lint
npm test
npm run build
npm run typecheck
E2E_PRODUCTION=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

Para o navegador gerenciado pelo Playwright, instale-o com `npx playwright install chromium` e omita `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `E2E_PRODUCTION=1` usa o build já produzido; sem a variável os testes iniciam `next dev`. Capturas dos seis módulos são geradas em `test-results/` nos testes de layout.

## Limitações e continuidade

Persistência continua por navegador/origem, sem sincronização entre dispositivos/abas, contas ou backend. Evidências são textuais; não há arquivos anexos, parâmetros de fabricante, APIs externas, IA ou certificação balística. Fluxos diagnósticos são definidos em código; não há editor genérico de fluxos. O catálogo é inicial e estático, com fontes reais a serem curadas no futuro. A exportação existente continua sendo o JSON do laudo ativo.

Medições são registros técnicos, sem comparação automática a tolerâncias inexistentes. Hipóteses não confirmam defeitos. Corrigir uma investigação não elimina achados já confirmados: o técnico deve revisá-los no laudo. Identificação pendente permite somente regras genéricas.

O plano relacional, índices, integridade e migração para PostgreSQL estão em `database-design.md`. Publicação no site depende de revisão/merge da branch; não há deploy automático executado por esta entrega.
