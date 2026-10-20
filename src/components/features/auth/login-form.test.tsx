import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/features/auth/login-form";
import { renderWithIntl } from "@/test/render-with-intl";

describe("login language", () => {
  it("renders the Spanish login copy", () => {
    const markup = renderWithIntl(<LoginForm />);
    expect(markup).toContain("Ingresá a Operia");
    expect(markup).toContain("Correo electrónico");
  });

  it("renders the English login copy", () => {
    const markup = renderWithIntl(<LoginForm />, "en");
    expect(markup).toContain("Sign in to Operia");
    expect(markup).toContain("Email address");
  });
});
