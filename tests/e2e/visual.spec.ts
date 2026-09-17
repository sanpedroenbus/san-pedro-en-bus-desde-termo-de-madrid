import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
} as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.getByRole("button", { name: "Menú" }).click();
  await page.getByTestId("theme-toggle").getByRole("button", { name: theme === "dark" ? "Oscuro" : "Claro" }).click();
  await page.getByRole("button", { name: "Cerrar menú" }).click();
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const theme of ["light", "dark"] as const) {
    test(`captures primary surfaces (${viewportName}, ${theme})`, async ({ page }) => {
      await page.setViewportSize(viewport);

      const consoleIssues: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") {
          consoleIssues.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => consoleIssues.push(`pageerror: ${error.message}`));

      await page.goto("/es");
      await expect(page.getByText("San Pedro en Bus").first()).toBeVisible();
      await setTheme(page, theme);
      await page.screenshot({ fullPage: true, path: `/tmp/sanpedroenbus-${viewportName}-${theme}-home.png` });

      await page.goto("/es/reportar");
      await expect(page.getByRole("heading", { name: "Reportar" })).toBeVisible();
      await page.screenshot({ fullPage: true, path: `/tmp/sanpedroenbus-${viewportName}-${theme}-reportar.png` });

      await page.getByRole("button", { name: "Íbamos hacinados" }).click();
      await page.getByTestId("submit-report").click();
      const missingUnitDialog = page.getByRole("dialog", {
        name: "¿Seguro que querés enviar un reporte sin número de unidad o placa?",
      });
      await expect(missingUnitDialog).toBeVisible();
      await page.screenshot({ fullPage: false, path: `/tmp/sanpedroenbus-${viewportName}-${theme}-missing-unit-dialog.png` });
      await missingUnitDialog.getByRole("button", { name: "Añadir número de unidad" }).click();

      await page.goto("/es/explorar");
      await expect(page.getByRole("heading", { name: "Reportes por ruta", exact: true })).toBeVisible();
      await expect(page.getByTestId("unit-explorer-chart")).toBeVisible();
      await page.screenshot({ fullPage: true, path: `/tmp/sanpedroenbus-${viewportName}-${theme}-explorar.png` });

      expect(consoleIssues).toEqual([]);
    });
  }
}
