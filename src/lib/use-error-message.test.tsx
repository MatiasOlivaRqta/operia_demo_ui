import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { useErrorMessage } from "@/lib/use-error-message";
import { renderWithIntl } from "@/test/render-with-intl";

function ErrorText({ error }: { error: { key?: string; message: string } }) {
  return createElement("span", null, useErrorMessage()(error));
}

describe("useErrorMessage forbidden message", () => {
  it.each([
    ["es", "No tenés permiso para realizar esta acción."],
    ["en", "You don&#x27;t have permission to do this."],
  ] as const)("translates a forbidden response in %s", (locale, expected) => {
    expect(
      renderWithIntl(
        createElement(ErrorText, { error: { key: "errors.forbidden", message: "" } }),
        locale,
      ),
    ).toContain(expected);
  });

  it.each([
    ["es", "No tenés permiso para hacer esto."],
    ["en", "You lack access to perform this action."],
  ] as const)("keeps a server translated message in %s", (locale, message) => {
    expect(renderWithIntl(createElement(ErrorText, { error: { message } }), locale)).toContain(
      message,
    );
  });
});
