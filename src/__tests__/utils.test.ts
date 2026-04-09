import { describe, it, expect } from "vitest";
import { htmlToMarkdown, htmlToText, unicodeSafeTruncate } from "../utils.js";

describe("unicodeSafeTruncate", () => {
  it("returns short strings unchanged", () => {
    expect(unicodeSafeTruncate("hello", 10)).toBe("hello");
  });

  it("truncates to maxChars", () => {
    expect(unicodeSafeTruncate("abcdef", 3)).toBe("abc");
  });

  it("handles emoji (multi-byte) correctly", () => {
    const emoji = "Hello 🌍🌎🌏";
    const truncated = unicodeSafeTruncate(emoji, 8);
    expect(truncated).toBe("Hello 🌍🌎");
  });
});

describe("htmlToMarkdown", () => {
  it("strips script tags", () => {
    expect(htmlToMarkdown("<p>Hello</p><script>alert(1)</script>")).not.toContain("alert");
  });

  it("strips style tags", () => {
    expect(htmlToMarkdown("<style>.x{color:red}</style><p>Hello</p>")).not.toContain("color");
  });

  it("strips noscript tags", () => {
    expect(htmlToMarkdown("<noscript>JS disabled</noscript><p>Hello</p>")).not.toContain("JS disabled");
  });

  it("converts headings", () => {
    const md = htmlToMarkdown("<h1>Title</h1><h2>Sub</h2>");
    expect(md).toContain("# Title");
    expect(md).toContain("## Sub");
  });

  it("converts links", () => {
    const md = htmlToMarkdown('<a href="https://example.com">Link</a>');
    expect(md).toContain("[Link](https://example.com)");
  });

  it("converts list items", () => {
    const md = htmlToMarkdown("<ul><li>One</li><li>Two</li></ul>");
    expect(md).toContain("- One");
    expect(md).toContain("- Two");
  });

  it("decodes HTML entities", () => {
    const md = htmlToMarkdown("<p>&amp; &lt; &gt; &quot;</p>");
    expect(md).toContain("& < > \"");
  });

  it("collapses excessive newlines", () => {
    const md = htmlToMarkdown("<p>A</p><p></p><p></p><p>B</p>");
    expect(md).not.toContain("\n\n\n");
  });
});

describe("htmlToText", () => {
  it("strips links but keeps text", () => {
    const text = htmlToText('<a href="http://x.com">Click</a>');
    expect(text).toContain("Click");
    expect(text).not.toContain("http://x.com");
  });

  it("strips heading markers", () => {
    const text = htmlToText("<h1>Title</h1>");
    expect(text).toContain("Title");
    expect(text).not.toContain("#");
  });
});
