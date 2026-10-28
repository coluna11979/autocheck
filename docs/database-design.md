# AutoCheck Check-up Builder V1 — modelo de dados

## Limites de domínio e persistência atual

O MVP e seu laudo continuam em `autocheck.inspection.v1`. `autocheck.builder.v2` contém um agregado versionado com veículos, modelos, inspeções, sessões e cópias dos laudos trocados. As duas chaves não são substituídas entre si. O adaptador troca o laudo ativo somente após salvar o anterior; dados legados são arquivados com ID `legacy`. Achados manuais mantêm o formato original; novos achados acrescentam origem, ID da fonte, evidência e data de confirmação. Preços e soma urgente não mudam.

`BuilderRepository` é a interface da unidade de trabalho. `LocalBuilderRepository` usa `StoragePort`, valida Zod e integridade antes de gravar. A interface permite futura implementação transacional em PostgreSQL sem dependência da UI em SQL. Casos de uso em `modules/builder/use-cases.ts` não acessam browser, rede ou armazenamento.

## Entidades, atributos e relações propostas para PostgreSQL

IDs reais serão UUID; seeds demonstrativos têm IDs estáveis e deverão ser mapeados a UUID na importação. Datas usam `timestamptz`; custos, `numeric(14,2)`; medições são texto com unidade e método, sem interpretação automática. Campos extensíveis de snapshots usam `jsonb` validado. PK e FK abaixo são obrigatórias salvo indicação.

| Entidade / tabela                                  | PK e atributos principais                                                                          | FKs e cardinalidade                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| VehicleMake / vehicle_makes                        | id, name                                                                                           | 1:N modelos                                                                                         |
| VehicleModel / vehicle_models                      | id, name                                                                                           | make_id → makes; 1:N versões                                                                        |
| VehicleVariant / vehicle_variants                  | id, name, engine, fuel, transmission                                                               | model_id → models; 1:N veículos                                                                     |
| Vehicle / vehicles                                 | id, plate, make, model, variant, engine, fuel, transmission, year, mileage, identification, owner  | variant_id opcional; inspeções/sessões N:1 veículo                                                  |
| TechnicalSystem / technical_systems                | id, name                                                                                           | 1:N componentes                                                                                     |
| Component / components                             | id, name                                                                                           | system_id → systems; fontes N:M por component_sources                                               |
| ComponentApplicability / component_applicability   | id, regra de marcas/modelos/versões/motores/anos, requires_identification                          | component_id → components                                                                           |
| TechnicalSource / technical_sources                | id, title, reference, verified, demonstration                                                      | N:M componentes/itens/fluxos por tabelas de ligação                                                 |
| CheckupTemplate / checkup_templates                | id, name, description, category, estimated_minutes, status, demonstration                          | 1:N versões; rascunho editável separado                                                             |
| CheckupTemplateVersion / checkup_template_versions | id, number, name, description, category, estimated_minutes, published_at, demonstration            | template_id → templates; UNIQUE(template_id, number)                                                |
| CheckupTemplateItem / checkup_template_items       | id, position, title, instruction, required, measurement_required, evidence_required                | version_id → versions; component_id → components; system_id → systems; fontes N:M                   |
| TemplateApplicability / template_applicability     | id, makes[], models[], variants[], engines[], year_from, year_to, requires_identification          | version_id → versions (1:1); rascunho guarda regra separada                                         |
| DiagnosticFlow / diagnostic_flows                  | id, name, version, start_node_id, demonstration                                                    | fontes N:M; 1:N nós; UNIQUE(id lógico, version)                                                     |
| DiagnosticNode / diagnostic_nodes                  | id, type, title, detail, hypothesis, confirmation_test, inconclusive                               | flow_id → flows; identidade composta (flow_id, node_key)                                            |
| DiagnosticTransition / diagnostic_transitions      | id, answer, position                                                                               | from_node_id e to_node_id → nodes do mesmo fluxo; UNIQUE(from_node_id, answer)                      |
| Inspection / inspections                           | id, vehicle_snapshot JSONB, template_snapshot JSONB, limitations, status, created_at, completed_at | vehicle_id → vehicles; template_version_id → versions; 1:N resultados                               |
| InspectionResult / inspection_results              | id, status, observation, measurement, evidence                                                     | inspection_id → inspections; item_id → items; UNIQUE(inspection_id, item_id)                        |
| DiagnosticSession / diagnostic_sessions            | id, flow_snapshot JSONB, current_node_id, status, limitations, created_at                          | vehicle_id → vehicles; flow_version_id → flows; 1:N respostas                                       |
| DiagnosticAnswer / diagnostic_answers              | id, position, value, evidence, answered_at                                                         | session_id → sessions; node_id → nodes; UNIQUE(session_id, position)                                |
| Finding / findings                                 | id, title, notes, priority, estimate, origin, evidence, confirmed_at                               | vehicle_id → vehicles; report_id → reports; inspection_result_id OU diagnostic_session_id opcionais |
| Report / reports                                   | id, vehicle_id opcional para legado, snapshot JSONB, updated_at                                    | 1:N achados; laudo original importado pode aguardar vínculo                                         |

As entidades Make/Model/Variant têm esquemas prontos, mas não usam catálogo fictício. O cadastro V1 aceita texto manual; IDs normalizados serão associados após curadoria. TechnicalSystem, Component e TechnicalSource são catálogo estático inicial. ComponentApplicability tem esquema preparado; a aplicabilidade operacional V1 é definida no template, não representa uma base técnica de fabricante.

## Restrições de integridade

- Placa normalizada é única no cadastro local. Ano 1900–2100, quilometragem não negativa. Versão, motor, combustível e transmissão ausentes mantêm identificação pendente.
- IDs de agregados, placas, itens, números de versão e resultados são únicos. Inspeções e sessões exigem veículo existente. Resultado deve pertencer ao snapshot da inspeção.
- Faixa de anos deve satisfazer `year_from <= year_to`. Arrays vazios significam regra genérica. Versões/motores específicos exigem identificação completa. Sem parâmetros técnicos de fabricante inferidos.
- Versão publicada e snapshot não sofrem UPDATE pelo editor. O rascunho preserva versões anteriores; publicação incrementa número. Duplicação gera novo template sem histórico. Arquivar não apaga inspeções.
- Estados de resultados: conforme, atenção, não conforme, não aplicável, não verificado. `unchecked` nunca equivale a conforme. Item obrigatório bloqueia encerramento se não verificado; não aplicável exige observação. Medição/evidência obrigatórias são verificadas antes de encerrar quando aplicáveis.
- Inspeção encerrada é imutável pelos casos de uso. Correções históricas futuras devem gerar adendo auditável, não UPDATE silencioso.
- Nós e transições precisam existir no mesmo fluxo. Ciclos e transições ambíguas são rejeitados, há limite de 50 passos e saída inconclusiva. Respostas são registros ordenados, nunca código executável.
- Corrigir resposta remove o caminho posterior da sessão atual para reavaliação; achados já confirmados não são automaticamente apagados. A UI exige revisão manual desses achados.
- Hipóteses só podem originar achados com confirmação técnica explícita, evidência e fonte da sessão. O adaptador verifica elegibilidade, veículo do laudo e duplicidade da fonte. Resultados preventivos precisam estar em atenção/não conforme para confirmação.
- No banco, preferir `ON DELETE RESTRICT` em registros históricos. Não há exclusão de veículos/templates nesta versão; arquivamento é a alternativa.

## Índices recomendados

- `UNIQUE vehicles(plate)`; `vehicles(make, model, year)`; `vehicle_variants(model_id, name, engine)`.
- `components(system_id)`; `component_applicability(component_id)`; GIN em arrays/regras somente se consultas justificarem.
- `checkup_templates(status, category)`; `UNIQUE checkup_template_versions(template_id, number)`; `checkup_template_items(version_id, position)`.
- `inspections(vehicle_id, created_at DESC)` e `(status, created_at)`; `UNIQUE inspection_results(inspection_id, item_id)`.
- `diagnostic_sessions(vehicle_id, created_at DESC)`; `UNIQUE diagnostic_answers(session_id, position)`; transições por `(from_node_id, answer)`.
- `findings(report_id, priority)`; índice parcial por fonte não nula para evitar duplicações dentro do laudo; `reports(vehicle_id, updated_at DESC)`.

## Esboço de estrutura PostgreSQL

```sql
CREATE TABLE vehicles (
  id uuid PRIMARY KEY, plate text NOT NULL UNIQUE,
  make text NOT NULL, model text NOT NULL, variant text NOT NULL DEFAULT '',
  engine text NOT NULL DEFAULT '', fuel text NOT NULL DEFAULT '',
  transmission text NOT NULL DEFAULT '', year int NOT NULL CHECK(year BETWEEN 1900 AND 2100),
  mileage numeric NOT NULL CHECK(mileage >= 0),
  identification text NOT NULL CHECK(identification IN ('pending','identified')),
  owner text NOT NULL DEFAULT ''
);
CREATE TABLE checkup_templates (
  id uuid PRIMARY KEY, name text NOT NULL, status text NOT NULL,
  draft jsonb NOT NULL, demonstration boolean NOT NULL DEFAULT false
);
CREATE TABLE checkup_template_versions (
  id uuid PRIMARY KEY, template_id uuid NOT NULL REFERENCES checkup_templates(id),
  number int NOT NULL CHECK(number > 0), snapshot jsonb NOT NULL,
  published_at timestamptz NOT NULL, UNIQUE(template_id, number)
);
CREATE TABLE inspections (
  id uuid PRIMARY KEY, vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  template_version_id uuid NOT NULL REFERENCES checkup_template_versions(id),
  vehicle_snapshot jsonb NOT NULL, template_snapshot jsonb NOT NULL,
  status text NOT NULL, limitations text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL, completed_at timestamptz
);
```

Esboço documental, não uma migração executável completa: criar tabelas filhas/constraints conforme o quadro antes de provisionar. Imutabilidade de versões deve ser imposta por permissões/trigger; transação de publicação deve bloquear o template para alocar o próximo número.

## Versionamento e plano de migração

1. Exportar e preservar as duas chaves originais e checksum do backup, sem limpá-las. Dados inválidos ou de versão desconhecida bloqueiam escrita no Builder; o MVP continua independente.
2. O migrador local reconhece somente o envelope Builder v1 e acrescenta `reports` vazio se ausente, mantendo os demais registros. Envelope atual é v2. Não presume que o payload legado tenha esse formato.
3. Implementar `BuilderRepository` no servidor com transações; manter storage adapter para operação local durante migração. Não há infraestrutura remota nesta entrega.
4. Normalizar IDs demonstrativos com tabela de correspondência. Inserir catálogo, veículos, templates/versões, inspeções/resultados, fluxos/sessões/respostas, laudos/achados nesta ordem. Preservar snapshots e dados sem fonte como origem manual/legada.
5. Importar laudo ativo do MVP e laudos arquivados sem duplicação. Vínculo por placa é sugestão revisável pelo usuário, nunca associação automática baseada apenas no nome/modelo.
6. Validar Zod, contagens, FKs, preços e totais; tornar importação idempotente por ID/chave de origem. Exibir resultado antes de mudar o repositório padrão. A migração precisa ter rollback e não apagar os backups locais.

## Limites conhecidos

Não há autenticação, isolamento por conta, sincronização entre dispositivos ou edição concorrente segura entre abas. O armazenamento é por origem/navegador; gravação do agregado é atômica para uma chave, mas as chaves legado/Builder não constituem transação conjunta. O laudo anterior é persistido antes da troca para reduzir risco de perda. Sem fotos/binários, PDFs, API por placa, documentação de fabricante, diagnóstico por IA ou tolerâncias inventadas. Evidências e fontes de confirmação são descritivas. Catálogo e fluxo são demonstrativos; fontes verificadas reais precisam ser cadastradas em uma evolução futura.
