import { describe, expect, it } from "vitest";
import { useErrorMessage } from "@/lib/use-error-message";
import { useValidationMessage } from "@/lib/use-validation-message";
import { renderWithIntl } from "@/test/render-with-intl";

function ValidationProbe({ message }: { message: string }) {
  const translate = useValidationMessage();
  return <p>{translate(message)}</p>;
}

function ErrorProbe({ error }: { error: { key?: string; message: string } }) {
  const getMessage = useErrorMessage();
  return <p>{getMessage(error)}</p>;
}

describe("localized error messages", () => {
  it("translates a required field and a parameterized limit into English", () => {
    expect(
      renderWithIntl(<ValidationProbe message="validation.product.categoryRequired" />, "en"),
    ).toContain("Enter a category.");
    expect(renderWithIntl(<ValidationProbe message="validation.maxLength|500" />, "en")).toContain(
      "500 characters",
    );
  });

  it("resolves keyed errors in Spanish and English and preserves API messages verbatim", () => {
    const error = { key: "errors.network", message: "mensaje interno" };
    expect(renderWithIntl(<ErrorProbe error={error} />)).toContain(
      "No pudimos conectar con el servicio.",
    );
    expect(renderWithIntl(<ErrorProbe error={error} />, "en")).toContain(
      "We couldn&#x27;t connect to the service. Check your connection and try again.",
    );
    expect(
      renderWithIntl(<ErrorProbe error={{ message: "API message in English" }} />, "es"),
    ).toContain("API message in English");
  });

  it("shows an already visible validation message in the newly selected language", () => {
    const visibleError = <ValidationProbe message="validation.product.categoryRequired" />;
    expect(renderWithIntl(visibleError)).toContain("Ingresá una categoría.");
    expect(renderWithIntl(visibleError, "en")).toContain("Enter a category.");
  });
});
