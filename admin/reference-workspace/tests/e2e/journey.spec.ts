import { test, expect } from "@playwright/test";
test("customer finds a part, requests it, supplier quotes, customer accepts", async ({
  browser,
}) => {
  const customer = await browser.newPage(),
    supplier = await browser.newPage();
  await customer.goto("http://localhost:8081");
  await customer
    .getByLabel("Email", { exact: true })
    .fill("customer@inficarx.test");
  await customer.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await customer.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    customer.getByText("The right part. The right fit."),
  ).toBeVisible();
  await customer
    .getByRole("button", { name: "Front Brake Pad Set", exact: true })
    .click();
  await expect(
    customer.getByText("Compare suppliers", { exact: true }),
  ).toBeVisible();
  await customer.getByRole("button", { name: "Request a quotation" }).click();
  const description = "E2E front brake pad request " + Date.now();
  await customer.getByLabel("What do you need?").fill(description);
  await customer
    .getByRole("button", { name: "Send request", exact: true })
    .click();
  await expect(
    customer.getByText("Request sent to suppliers.").first(),
  ).toBeVisible();
  await supplier.goto("http://localhost:8082");
  await supplier
    .getByLabel("Email", { exact: true })
    .fill("supplier@inficarx.test");
  await supplier.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await supplier.getByRole("button", { name: "Sign in", exact: true }).click();
  await supplier
    .getByRole("button", { name: "View customer requests" })
    .click();
  await expect(supplier.getByText(description, { exact: true })).toBeVisible();
  await supplier.getByLabel("Quotation price").first().fill("11.750");
  await supplier
    .getByRole("button", { name: "Send quotation" })
    .first()
    .click();
  await expect(
    supplier.getByText("Quotation sent to the customer."),
  ).toBeVisible();
  await customer.reload();
  await expect(
    customer.getByRole("button", { name: "Accept quotation" }).first(),
  ).toBeVisible();
  await customer
    .getByRole("button", { name: "Accept quotation" })
    .first()
    .click();
  await expect(
    customer
      .getByText(
        "Quotation accepted. Arrange payment and collection directly with the shop.",
      )
      .first(),
  ).toBeVisible();
  await customer.screenshot({
    path: "test-results/customer-requests.png",
    fullPage: true,
  });
  await supplier.screenshot({
    path: "test-results/supplier-requests.png",
    fullPage: true,
  });
  await customer.close();
  await supplier.close();
});
test("3D viewer renders and controls move through steps", async ({ page }) => {
  await page.goto("http://localhost:8000/viewer/index.html");
  await expect(page.locator("#error")).toHaveText("");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator("#step")).toContainText("02 / 05");
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(page.locator("#step")).toContainText("01 / 05");
  await page.screenshot({ path: "test-results/simulator.png" });
});
test("administrator can sign in and inspect catalog", async ({ page }) => {
  await page.goto("http://localhost:8000/admin");
  await page.getByLabel("Email", { exact: true }).fill("admin@inficarx.test");
  await page.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Master catalog" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/admin.png", fullPage: true });
});
test("supplier updates inventory and customer uses catalog assistant", async ({
  browser,
}) => {
  const supplier = await browser.newPage(),
    customer = await browser.newPage();
  await supplier.goto("http://localhost:8082");
  await supplier
    .getByLabel("Email", { exact: true })
    .fill("supplier@inficarx.test");
  await supplier.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await supplier.getByRole("button", { name: "Sign in", exact: true }).click();
  await supplier
    .getByRole("button", { name: "Manage inventory", exact: true })
    .click();
  await supplier
    .getByRole("button", { name: "Edit listing", exact: true })
    .first()
    .click();
  await supplier.getByLabel("Price", { exact: true }).fill("31.125");
  await supplier.getByLabel("Stock quantity", { exact: true }).fill("4");
  await supplier
    .getByRole("button", { name: "Save listing", exact: true })
    .click();
  await expect(supplier.getByText("4 units", { exact: true })).toBeVisible();
  await supplier.screenshot({
    path: "test-results/supplier-inventory.png",
    fullPage: true,
  });
  await customer.goto("http://localhost:8081");
  await customer
    .getByLabel("Email", { exact: true })
    .fill("customer@inficarx.test");
  await customer.getByLabel("Password", { exact: true }).fill("DemoPass123!");
  await customer.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    customer.getByText("The right part. The right fit."),
  ).toBeVisible();
  await customer.screenshot({
    path: "test-results/marketplace.png",
    fullPage: true,
  });
  await customer
    .getByRole("button", { name: "Ask the assistant", exact: true })
    .click();
  await customer
    .getByLabel("Your question", { exact: true })
    .fill("My Camry brakes squeak. What could it be?");
  await customer
    .getByRole("button", { name: "Ask assistant", exact: true })
    .click();
  await expect(
    customer.getByText("Catalog search mode · AI provider not configured."),
  ).toBeVisible();
  await customer.screenshot({
    path: "test-results/assistant.png",
    fullPage: true,
  });
  await supplier.close();
  await customer.close();
});
test("generated Blender GLB loads in the viewer", async ({ page }) => {
  await page.goto(
    "http://localhost:8000/viewer/index.html?model=/viewer/concept.glb",
  );
  await expect(page.locator("#selection")).toContainText("Generated candidate");
  await expect(page.locator("#error")).toHaveText("");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});
