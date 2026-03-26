const ALLOWED_TAGS = new Set([
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "I",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "U",
  "UL",
]);

const ALLOWED_STYLE_PROPERTIES = new Set([
  "font-style",
  "font-weight",
  "text-decoration",
]);

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const sanitizeStyleAttribute = (styleValue: string): string => {
  const declarations = styleValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const sanitizedDeclarations = declarations
    .map((declaration) => {
      const [rawProperty, ...rawValueParts] = declaration.split(":");
      const property = rawProperty?.trim().toLowerCase();
      const value = rawValueParts.join(":").trim();

      if (!property || !value || !ALLOWED_STYLE_PROPERTIES.has(property)) {
        return null;
      }

      return `${property}: ${value}`;
    })
    .filter((value): value is string => Boolean(value));

  return sanitizedDeclarations.join("; ");
};

const sanitizeNode = (node: Node, documentRef: Document): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) {
    return documentRef.createTextNode(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;

  if (!ALLOWED_TAGS.has(element.tagName)) {
    const fragment = documentRef.createDocumentFragment();

    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child, documentRef);

      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    });

    return fragment;
  }

  const normalizedTagName =
    element.tagName === "B"
      ? "strong"
      : element.tagName === "I"
        ? "em"
        : element.tagName.toLowerCase();

  const sanitizedElement = documentRef.createElement(normalizedTagName);
  const sanitizedStyle = sanitizeStyleAttribute(
    element.getAttribute("style") ?? "",
  );

  if (sanitizedStyle && normalizedTagName === "span") {
    sanitizedElement.setAttribute("style", sanitizedStyle);
  }

  Array.from(element.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child, documentRef);

    if (sanitizedChild) {
      sanitizedElement.appendChild(sanitizedChild);
    }
  });

  return sanitizedElement;
};

export const sanitizeRichTextHtml = (html: string): string => {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const container = parsed.createElement("div");

  Array.from(parsed.body.childNodes).forEach((node) => {
    const sanitizedNode = sanitizeNode(node, parsed);

    if (sanitizedNode) {
      container.appendChild(sanitizedNode);
    }
  });

  return container.innerHTML.trim();
};

export const richTextToPlainText = (html: string): string => {
  if (!html.trim()) {
    return "";
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(
    sanitizeRichTextHtml(html),
    "text/html",
  );
  return normalizeWhitespace(parsed.body.textContent ?? "");
};

export const isRichTextEffectivelyEmpty = (html: string): boolean =>
  richTextToPlainText(html).length === 0;
