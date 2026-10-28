import { test, expect, type Page } from "@playwright/test";
const nav = async (page: Page, label: string) => {
  await page
    .locator(".builder-nav")
    .getByRole("button", { name: label, exact: true })
    .click();
};
async function register(page: Page) {
  await nav(page, "Veículos");
  const view = page.locator(".builder-two");
  await view.getByLabel("Placa", { exact: true }).fill("ABC1D23");
  await view.getByLabel("Marca", { exact: true }).fill("Marca manual");
  await view.getByLabel("Modelo", { exact: true }).fill("Modelo manual");
  await view.getByLabel("Versão", { exact: true }).fill("Versão informada");
  await view.getByLabel("Motorização", { exact: true }).fill("Motor manual");
  await view.getByLabel("Combustível", { exact: true }).fill("Flex");
  await view.getByLabel("Transmissão", { exact: true }).fill("Manual");
  await view.getByRole("button", { name: "Salvar veículo" }).click();
  await expect(view.getByText("Identificado manualmente")).toBeVisible();
}
test("legacy manual inspection and pricing remain functional", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("Ex.: João Silva").fill("Ana original");
  await page
    .getByPlaceholder("Ex.: Volkswagen Polo 1.0 TSI")
    .fill("Carro original");
  await page.getByLabel("Categoria do veículo").selectOption("sedan");
  await page.getByRole("button", { name: /Premium/ }).click();
  await expect(page.locator(".service-total")).toContainText("419,00");
  await page
    .getByPlaceholder("Ex.: Desgaste nas pastilhas de freio dianteiras")
    .fill("Achado manual");
  await page.getByPlaceholder("0,00", { exact: true }).fill("125.50");
  await page.getByRole("button", { name: "Adicionar achado" }).click();
  await expect(page.locator(".urgent-total")).toContainText("125,50");
  await page.reload();
  await expect(page.getByPlaceholder("Ex.: João Silva")).toHaveValue(
    "Ana original",
  );
  await page.getByRole("button", { name: /Achados registrados/ }).click();
  await page
    .getByRole("button", { name: "Excluir achado: Achado manual" })
    .click();
  await expect(page.locator(".urgent-total")).toContainText("0,00");
});
test("builder creates versions, persists results and integrates confirmed findings without losing original", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/");
  await page.getByPlaceholder("Ex.: João Silva").fill("Proprietário original");
  await register(page);
  await nav(page, "Biblioteca de Check-ups");
  await page.getByRole("button", { name: "Adicionar demonstrativos" }).click();
  await expect(
    page.getByRole("heading", { name: "Check-up de Freios", exact: true }),
  ).toBeVisible();
  await nav(page, "Nova Inspeção");
  await page
    .getByLabel("Veículo da inspeção")
    .selectOption({ label: "ABC1D23 · Marca manual Modelo manual" });
  await page.getByLabel("Check-up publicado").selectOption("demo-template-2");
  await page.getByRole("button", { name: "Gerar roteiro de inspeção" }).click();
  await page
    .getByLabel("Resultado: Verificar discos e pastilhas")
    .selectOption("nonconform");
  await page
    .getByLabel("Evidência descritiva: Verificar discos e pastilhas")
    .fill("Evidência de teste manual");
  await page
    .getByRole("button", { name: "Abrir laudo deste veículo", exact: true })
    .click();
  await page
    .getByText("Registrar achado tecnicamente confirmado", { exact: true })
    .click();
  await page
    .getByLabel("Teste, evidência e fonte de confirmação")
    .fill("Teste documentado; fonte técnica consultada pelo técnico");
  await page.getByLabel("Estimativa do achado (R$)").fill("250.50");
  await page
    .getByLabel(
      "Confirmo tecnicamente este achado após teste e análise da evidência",
    )
    .check();
  await page
    .getByRole("button", { name: "Confirmar e enviar ao laudo" })
    .click();
  await nav(page, "Relatório");
  await expect(page.locator(".urgent-total")).toContainText("250,50");
  await expect(page.locator(".timeline")).toContainText("Inspeção preventiva");
  await page.getByRole("button", { name: "Abrir laudo original" }).click();
  await expect(page.getByPlaceholder("Ex.: João Silva")).toHaveValue(
    "Proprietário original",
  );
  await nav(page, "Biblioteca de Check-ups");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Check-up de Freios",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nome do check-up").fill("Freios versão 2");
  await page.getByRole("button", { name: "Publicar nova versão" }).click();
  await nav(page, "Nova Inspeção");
  await page
    .getByRole("button", { name: /ABC1D23 · Check-up de Freios/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check-up de Freios", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Resultado: Verificar discos e pastilhas"),
  ).toHaveValue("nonconform");
  await page.reload();
  await nav(page, "Nova Inspeção");
  await page
    .getByRole("button", { name: /ABC1D23 · Check-up de Freios/ })
    .click();
  await expect(
    page.getByLabel("Evidência descritiva: Verificar discos e pastilhas"),
  ).toHaveValue("Evidência de teste manual");
  expect(errors).toEqual([]);
});
test("guided diagnosis supports correction and never confirms a hypothesis automatically", async ({
  page,
}) => {
  await page.goto("/");
  await register(page);
  await nav(page, "Diagnóstico Guiado");
  await page
    .getByLabel("Veículo da investigação")
    .selectOption({ label: "ABC1D23 · Marca manual Modelo manual" });
  await page
    .getByRole("button", { name: "Iniciar investigação de ruído" })
    .click();
  await page.getByRole("button", { name: "Sim", exact: true }).click();
  await page
    .getByRole("button", { name: "Inspeção realizada", exact: true })
    .click();
  await page
    .getByLabel("Observação ou medição (com unidade e método)")
    .fill("Observação visual de componente acessível");
  await page.getByRole("button", { name: "Registrar e continuar" }).click();
  await page.getByRole("button", { name: "Sim", exact: true }).click();
  await expect(
    page.getByText("HIPÓTESE · NÃO CONFIRMADA", { exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("autocheck.inspection.v1")!),
  );
  expect(stored.findings).toHaveLength(0);
  await page
    .getByRole("button", { name: "Corrigir a partir daqui" })
    .first()
    .click();
  await page.getByRole("button", { name: "Não", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Investigação inconclusiva" }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "Diagnóstico Guiado");
  await page
    .getByRole("button", { name: /ABC1D23 · Ruído na suspensão/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Investigação inconclusiva" }),
  ).toBeVisible();
});
test("templates can be created, duplicated, reordered and archived", async ({
  page,
}) => {
  await page.goto("/");
  await nav(page, "Biblioteca de Check-ups");
  await page.getByRole("button", { name: "Criar modelo", exact: true }).click();
  await page.getByLabel("Nome do check-up").fill("Modelo próprio");
  await page.getByLabel("Título do item 1").fill("Observação manual");
  await page.getByRole("button", { name: "Adicionar item técnico" }).click();
  await page.getByLabel("Título do item 2").fill("Segundo item");
  await page.getByRole("button", { name: "Subir item 2" }).click();
  await expect(page.getByLabel("Título do item 1")).toHaveValue("Segundo item");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Modelo próprio", exact: true }),
  });
  await card.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Publicar nova versão" }).click();
  await card.getByRole("button", { name: "Duplicar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(
    page.getByRole("heading", { name: "Modelo próprio (cópia)", exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Arquivar", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Editar", exact: true }),
  ).toBeDisabled();
});
test("corrupted builder data is preserved and the original MVP remains usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("autocheck.builder.v2", "invalid"),
  );
  await page.reload();
  await expect(
    page.locator(".builder-workspace").getByRole("alert"),
  ).toContainText("Nenhuma chave foi alterada");
  await expect(page.getByPlaceholder("Ex.: João Silva")).toBeVisible();
  await page.getByPlaceholder("Ex.: João Silva").fill("Ainda utilizável");
  expect(
    await page.evaluate(() => localStorage.getItem("autocheck.builder.v2")),
  ).toBe("invalid");
});
for (const width of [390, 768, 1440])
  test(`responsive workflow has no horizontal overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    for (const label of [
      "Painel do Técnico",
      "Veículos",
      "Biblioteca de Check-ups",
      "Nova Inspeção",
      "Diagnóstico Guiado",
      "Relatório",
    ]) {
      await nav(page, label);
      await page.screenshot({
        path: testInfo.outputPath(`${label}.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
