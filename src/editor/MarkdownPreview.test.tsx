import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownPreview } from "./MarkdownPreview";

describe("<MarkdownPreview />", () => {
  it("renders plain text content", () => {
    render(<MarkdownPreview content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders an h1 for # Heading", () => {
    render(<MarkdownPreview content="# Heading" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Heading");
  });

  it("renders <strong> for **bold**", () => {
    const { container } = render(<MarkdownPreview content="**bold**" />);
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent("bold");
  });

  it("renders <em> for *italic*", () => {
    const { container } = render(<MarkdownPreview content="*italic*" />);
    const em = container.querySelector("em");
    expect(em).not.toBeNull();
    expect(em).toHaveTextContent("italic");
  });

  it("renders unordered list `- a`", () => {
    const { container } = render(<MarkdownPreview content={"- a\n- b"} />);
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0]).toHaveTextContent("a");
    expect(items[1]).toHaveTextContent("b");
  });

  it("renders <del> for ~~strike~~ via remark-gfm", () => {
    const { container } = render(<MarkdownPreview content="~~strike~~" />);
    const del = container.querySelector("del");
    expect(del).not.toBeNull();
    expect(del).toHaveTextContent("strike");
  });

  it("renders raw HTML via rehype-raw", () => {
    const { container } = render(
      <MarkdownPreview content={'<span class="raw">hi</span>'} />,
    );
    const span = container.querySelector("span.raw");
    expect(span).not.toBeNull();
    expect(span).toHaveTextContent("hi");
  });

  it("wrapper has class gp-prose", () => {
    const { container } = render(<MarkdownPreview content="Hi" />);
    const wrapper = container.querySelector(".gp-prose");
    expect(wrapper).not.toBeNull();
  });

  it("includes custom className on wrapper", () => {
    const { container } = render(
      <MarkdownPreview content="Hi" className="my-custom-class" />,
    );
    const wrapper = container.querySelector(".gp-prose.my-custom-class");
    expect(wrapper).not.toBeNull();
  });
});
