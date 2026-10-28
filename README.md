# AutoCheck

MVP de inspeção automotiva com Next.js App Router, TypeScript, Tailwind CSS 4 e componente Button no padrão shadcn/ui (Radix Slot + CVA).

## Desenvolvimento

Requer Node.js 20.9+ e npm. Validado com Node.js 24.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

Abra a aplicação na porta 3000. Não requer credenciais, banco de dados ou serviços externos.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Fluxo

1. Identifique o veículo e escolha categoria e plano.
2. Selecione cada um dos seis sistemas e marque os verificados, inclusive quando não houver achados.
3. Registre descrição, observação, prazo e estimativa do reparo. Exclua itens na aba de achados registrados.
4. Acompanhe o relatório e a linha do tempo em tempo real. O total urgente inclui somente reparos urgentes; o preço do check-up é exibido separadamente.
5. Exporte uma cópia JSON pelo botão de exportação simulada.

Preços demonstrativos: Essencial R$149, Completo R$249 e Premium R$349; multiplicadores de categoria: compacto 1, sedã 1,2 e SUV 1,5, arredondados para reais inteiros. Estimativas não constituem orçamento aprovado.

Os dados são salvos em `localStorage` (`autocheck.inspection.v1`), para uma inspeção por navegador/origem, sem sincronização ou autenticação. Não use este MVP para armazenar dados sensíveis em computadores compartilhados. Falhas de leitura preservam o conteúdo anterior e mantêm a sessão apenas em memória. A exportação é demonstrativa e não gera PDF nem envia dados a terceiros.

## Estrutura

- `app/`: rotas, layout e estilos responsivos dark mode.
- `components/dashboard.tsx`: fluxo de inspeção e relatório.
- `components/ui/button.tsx`: componente shadcn/ui local e personalizável.
- `lib/autocheck.ts`: tipos, preços, prioridades e validação da persistência.
- `tests/`: verificações das regras de negócio.

`components.json` configura aliases e estilo para adicionar outros componentes shadcn/ui. A interface usa fontes do sistema e não depende de downloads de fontes em tempo de execução.

## AutoCheck 2.0 — Check-up Builder V1

Evolução aditiva do MVP, sem substituição do painel, preços ou laudo. Navegue pelos seis módulos no topo ou na lateral:

1. **Veículos**: cadastre placa, marca, modelo, versão, motor, combustível, transmissão, ano e km. Tudo é manual. Identificação incompleta bloqueia regras dependentes de versão/motor.
2. **Biblioteca de Check-ups**: crie, edite rascunhos, reordene itens, configure obrigatoriedade e aplicabilidade; publique uma versão antes de executar. Duplicar cria outro template. Arquivar preserva o histórico. O botão de demonstrativos adiciona os cinco modelos uma única vez, sem substituir os próprios.
3. **Nova Inspeção**: selecione veículo/modelo publicado, gere o roteiro e registre resultados, observações, medições, evidências e limitações. O progresso parcial é persistido. Encerrar torna resultados imutáveis e verifica campos obrigatórios.
4. **Diagnóstico Guiado**: investigação determinística de ruído na suspensão, com perguntas, instruções, medição descritiva, condição e encerramento. Corrija respostas pelo histórico ou encerre inconclusivamente.
5. Para registrar um achado de um novo fluxo, **abra o laudo desse veículo**, registre teste/evidência e confirme tecnicamente. Hipóteses não geram achados sozinhas. Os três níveis de criticidade e as estimativas originais são preservados.
6. **Relatório**: use o mesmo laudo digital, exclusão manual e exportação JSON. Laudos são separados por veículo; ao trocar, o laudo anterior é arquivado. **Abrir laudo original** restaura o laudo anterior à primeira vinculação.

### Dados e arquitetura

- `modules/builder/models.ts`: esquemas Zod e tipos dos seis domínios.
- `modules/builder/use-cases.ts`: cadastro, aplicabilidade, versionamento, execução, motor determinístico e adaptador de laudo.
- `modules/builder/repositories.ts`: interface de unidade de trabalho, porta de storage, validação e migração.
- `modules/builder/catalog.ts`: catálogo e cinco modelos/fluxo demonstrativos explícitos.
- `components/builder/`: interface por domínio e controles reutilizáveis.
- [Modelo de dados e plano PostgreSQL](docs/database-design.md).

A chave `autocheck.inspection.v1` continua acessível. Os novos módulos usam `autocheck.builder.v2`, sem limpar chaves antigas. Não há consulta real por placa: `VehicleDataProvider` é apenas um contrato para implementação futura. Os modelos são genéricos; o check-up de blindagem não é certificação balística. Medições não são comparadas a parâmetros não cadastrados.

### Testes adicionais

```sh
npm test
npm run lint
npm run build
npm run typecheck
# Instalação do navegador para testes em uma máquina nova:
npx playwright install chromium
npm run test:e2e
# Neste ambiente, reutilize o Chromium já disponível:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

O Playwright inicia uma instância de desenvolvimento na porta 3100. Os testes verificam regressão do MVP, templates e versões, persistência, laudos, investigação e layout em celular/tablet/desktop. Testes de domínio cobrem identificação pendente, validação, migração, bloqueio de ciclos, evidências e confirmação explícita.

Limitações: sem login, backend, sincronização entre dispositivos, fotos ou isolamento entre usuários do mesmo navegador. Evite editar simultaneamente em várias abas. A exportação do laudo inclui o laudo ativo, não todo o banco local do Builder. Fontes técnicas verificadas e editor genérico de fluxos diagnósticos ficam para etapas futuras; o fluxo demonstrativo é definido em código.

O [resumo da entrega V1](docs/checkup-builder-v1.md) detalha os módulos, a validação e as limitações. Para validar o build de produção com Playwright, execute `npm run build` e depois `E2E_PRODUCTION=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e`.
