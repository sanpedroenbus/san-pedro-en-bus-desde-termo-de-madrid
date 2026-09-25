import { expect, test } from "@playwright/test";

// Duplicate suppression on the in-memory dashboard is keyed by
// route+problems+unit alone (not by requester), so two projects submitting
// the exact same payload in the same run would collide. Keep the unit unique
// per project/run so this suite never trips its own dedup window.
function getUniqueTestUnit(projectName: string) {
  const runId = Number(process.env.GITHUB_RUN_ID ?? Date.now());
  const runAttempt = Number(process.env.GITHUB_RUN_ATTEMPT ?? 0);
  const projectOffset = projectName === "mobile" ? 10_000 : 20_000;
  const numericCode = 10_000 + ((runId + runAttempt * 997 + projectOffset) % 90_000);
  return `U${numericCode}`;
}

test("home exposes the two primary actions and the disclaimer", async ({ page }) => {
  await page.goto("/es");

  await expect(page.getByText("San Pedro en Bus").first()).toBeVisible();
  await expect(page.getByTestId("home-report")).toBeVisible();
  await expect(page.getByTestId("home-explore")).toBeVisible();
  await expect(page.getByText("Proyecto ciudadano, no afiliado a ninguna empresa de transporte")).toBeVisible();
});

test("report flow submits across categories, shows success feedback, and can be undone", async ({ page }, testInfo) => {
  const unit = getUniqueTestUnit(testInfo.project.name);

  await page.goto("/es/reportar");

  await expect(page.getByRole("heading", { name: "Reportar" })).toBeVisible();

  // Route selection.
  await page.getByRole("button", { name: "Granadilla", exact: true }).click();

  // Multi-select across two different problem categories.
  await page.getByRole("button", { name: "No tiene horario claro para pasar" }).click(); // fiabilidad y horarios
  await page.getByRole("button", { name: "Me acosaron" }).click(); // seguridad
  await expect(page.getByRole("button", { name: "No tiene horario claro para pasar" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Me acosaron" })).toHaveAttribute("aria-pressed", "true");

  await page.getByPlaceholder("Ej: 51 o SJB1234").fill(unit);

  const submitRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/reports") && request.method() === "POST",
  );
  await page.getByTestId("submit-report").click();
  const request = await submitRequest;
  expect(request.postDataJSON()).toEqual({ route: "GRANADILLA", problems: ["no_horario_claro", "acoso"], unit });

  await expect(page.getByText("Reporte guardado. Gracias por reportar con sinceridad")).toBeVisible();
  const undoButton = page.getByRole("button", { name: "Deshacer" });
  await expect(undoButton).toBeVisible();

  const undoRequest = page.waitForRequest(
    (request) => request.url().includes("/api/reports/") && request.method() === "DELETE",
  );
  await undoButton.click();
  expect((await undoRequest).postDataJSON()).toHaveProperty("undoToken");

  await page.waitForURL(/\/es\/explorar/);
});

test("report flow blocks an invalid unit code", async ({ page }) => {
  await page.goto("/es/reportar");

  await page.getByRole("button", { name: "Íbamos hacinados" }).click();
  await page.getByPlaceholder("Ej: 51 o SJB1234").fill("!!!");
  await expect(page.getByText("Ingresá el número de unidad o la placa, o dejá el campo vacío")).toBeVisible();
  await expect(page.getByTestId("submit-report")).toBeDisabled();
});

test("report flow requires at least one problem before it can be submitted", async ({ page }) => {
  await page.goto("/es/reportar");

  await expect(page.getByText("Elegí al menos un problema para poder enviar el reporte")).toBeVisible();
  await expect(page.getByTestId("submit-report")).toBeDisabled();
});

test("report flow confirms a missing unit and can return focus to the unit field", async ({ page }) => {
  await page.route("**/api/reports", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, report: { id: "missing-unit-report" }, undoToken: "missing-unit-undo" }),
    });
  });
  await page.goto("/es/reportar");

  await page.getByRole("button", { name: "Íbamos hacinados" }).click();
  await page.getByTestId("submit-report").click();

  const dialog = page.getByRole("dialog", { name: "¿Seguro que querés enviar un reporte sin número de unidad o placa?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Añadir número de unidad" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByPlaceholder("Ej: 51 o SJB1234")).toBeFocused();

  await page.getByTestId("submit-report").click();
  await expect(dialog).toBeVisible();
  const reportRequest = page.waitForRequest(
    (request) => request.url().endsWith("/api/reports") && request.method() === "POST",
  );
  await dialog.getByRole("button", { name: "Confirmar" }).click();

  expect((await reportRequest).postDataJSON()).toEqual({ route: "LA_CAMPINA", problems: ["hacinados"], unit: null });
});

test("explore filters narrow the dashboard to a single route", async ({ page }) => {
  await page.goto("/es/explorar");

  const filtersButton = page.getByRole("button", { name: "Filtros" });
  await filtersButton.click();
  const filterDialog = page.locator(".centered-popover", { hasText: "Filtrar estadísticas" });
  await expect(filterDialog).toBeVisible();

  await page.getByRole("button", { name: "San Ramón", exact: true }).click();
  await page.getByRole("button", { name: "7 días", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page).toHaveURL(/ruta=SAN_RAMON/);
  await expect(page).toHaveURL(/rango=sevenDays/);

  // Regression coverage for the route filter that used to silently do nothing
  // on the in-memory dashboard path: the "reports per route" chart must show
  // only the selected route once applied.
  const routeVolumeSection = page.locator("#report-volume");
  await expect(routeVolumeSection.getByText("San Ramón", { exact: true })).toBeVisible();
  await expect(routeVolumeSection.getByText("La Europa", { exact: true })).toHaveCount(0);
});

test("explore filters narrow the dashboard by problem", async ({ page }) => {
  await page.goto("/es/explorar?rango=all");

  const problemsSection = page.locator("#problems");
  await expect(problemsSection.getByText("Había cucarachas", { exact: true })).toBeVisible();
  const routeVolumeSection = page.locator("#report-volume");
  const totalBefore = await getTotalReports(routeVolumeSection);

  await page.getByRole("button", { name: "Filtros" }).click();
  const filterDialog = page.locator(".centered-popover", { hasText: "Filtrar estadísticas" });
  await expect(filterDialog).toBeVisible();

  await filterDialog.getByRole("button", { name: "Había cucarachas", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page).toHaveURL(/problema=cucarachas/);

  // Filtering by a single problem can only ever narrow the dataset (every
  // remaining report carries "cucarachas", by definition of the filter) --
  // it must never show as many or more reports than the unfiltered total.
  const totalAfter = await getTotalReports(routeVolumeSection);
  expect(totalAfter).toBeLessThan(totalBefore);
  expect(totalAfter).toBeGreaterThan(0);
});

async function getTotalReports(section: import("@playwright/test").Locator) {
  const values = await section.locator("g text").allTextContents();
  return values.map(Number).filter((n) => Number.isFinite(n)).reduce((sum, n) => sum + n, 0);
}

test("report form links out to the open-ended report form", async ({ page }) => {
  await page.goto("/es/reportar");

  const openReportLink = page.getByRole("link", { name: /Contanoslo acá/ });
  await expect(openReportLink).toBeVisible();
  await expect(openReportLink).toHaveAttribute("target", "_blank");
  await expect(openReportLink).toHaveAttribute("href", /^https:\/\//);
});

test("dashboard reports-per-route chart reflects the two heaviest seeded routes", async ({ page }) => {
  await page.goto("/es/explorar");

  await expect(page.getByRole("heading", { name: "Reportes por ruta", exact: true })).toBeVisible();
  const routeVolumeSection = page.locator("#report-volume");
  const yAxisLabels = routeVolumeSection.locator(".recharts-yAxis-tick-labels text");
  await expect(yAxisLabels.first()).toBeVisible();
  const routeLabels = await yAxisLabels.evaluateAll((elements) => elements.map((element) => element.textContent));

  expect(routeLabels[0]).toBe("San Ramón");
  expect(routeLabels[1]).toBe("La Europa");
});

test("dashboard renders all seven modules", async ({ page }) => {
  await page.goto("/es/explorar");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Reportes por ruta", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Problemas más reportados", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reportes por categoría", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reportes en el tiempo", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unidades con más reportes", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explorar unidad", exact: true })).toBeVisible();
  await expect(page.getByTestId("unit-explorer-chart")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detalle de cada ruta", exact: true })).toBeVisible();
});

test("explore selects a most-reported unit and scrolls the unit explorer into view", async ({ page }) => {
  await page.goto("/es/explorar");
  await page.waitForLoadState("networkidle");

  const firstRow = page.getByTestId("worst-unit-row").first();
  const unitLabel = await firstRow.locator(".font-mono").first().innerText();

  await firstRow.click();
  await expect(page.locator("#unit-explorer")).toBeInViewport();
  await expect(page.locator("#unit-explorer-input")).toHaveValue(unitLabel);
  await expect(page.getByTestId("unit-explorer-chart")).toBeVisible();
});

test("theme toggle switches the app to dark mode", async ({ page }) => {
  await page.goto("/es/explorar");

  await page.getByRole("button", { name: "Menú" }).click();
  await expect(page.getByTestId("theme-toggle")).toBeVisible();
  await page.getByTestId("theme-toggle").getByRole("button", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("the 16-problem selector stays reachable and unclipped on a 375px phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/es/reportar");

  const categories = ["Fiabilidad y horarios", "Paradas", "Seguridad", "Condición de la unidad", "Convivencia"];
  for (const category of categories) {
    await expect(page.getByText(category, { exact: true })).toBeVisible();
  }

  const problems = [
    "No tiene horario claro para pasar",
    "No hizo la parada",
    "Me acosaron",
    "Íbamos hacinados",
    "El chofer me trató mal a mí o a otro pasajero",
  ];
  const viewportWidth = page.viewportSize()!.width;
  for (const problem of problems) {
    const button = page.getByRole("button", { name: problem });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth);
  }
});

test("home report counter keeps four digits clear of its icon on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/es");
  await page.waitForLoadState("networkidle");

  const count = page.getByTestId("home-report-count").filter({ visible: true });
  const icon = page.getByTestId("home-report-count-icon").filter({ visible: true });
  await expect(count).toBeVisible();
  await expect(icon).toBeVisible();
  await count.evaluate((element) => { element.textContent = "9999"; });
  await expect(count).toHaveText("9999");
  const countBox = await count.boundingBox();
  const iconBox = await icon.boundingBox();

  expect(countBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(countBox!.x + countBox!.width).toBeLessThan(iconBox!.x);
});
