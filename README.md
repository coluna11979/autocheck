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
