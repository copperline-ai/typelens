import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AddDocumentButton } from "../add-document-button";

describe("AddDocumentButton", () => {
  it("renders as an icon-only action with an accessible label", () => {
    const onClick = vi.fn();

    const html = renderToStaticMarkup(<AddDocumentButton onClick={onClick} />);

    expect(html).toContain('aria-label="Add document"');
    expect(html).toContain('title="Add document"');
    expect(html).not.toContain("Add Document");
  });
});
