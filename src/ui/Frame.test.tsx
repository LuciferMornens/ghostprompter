import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Frame } from "./Frame";

describe("<Frame />", () => {
  it("renders children inside a gp-frame wrapper", () => {
    const { container, getByText } = render(
      <Frame>
        <span>hi</span>
      </Frame>,
    );
    expect(container.querySelector(".gp-frame")).not.toBeNull();
    expect(getByText("hi")).toBeInTheDocument();
  });

  it("renders the two bottom corner spans needed for the bracket effect", () => {
    const { container } = render(
      <Frame>
        <span>hi</span>
      </Frame>,
    );
    expect(container.querySelector(".gp-frame-bl")).not.toBeNull();
    expect(container.querySelector(".gp-frame-br")).not.toBeNull();
  });

  it("applies gp-frame-hot when hot=true", () => {
    const { container } = render(
      <Frame hot>
        <span>hi</span>
      </Frame>,
    );
    expect(container.querySelector(".gp-frame-hot")).not.toBeNull();
  });

  it("does not apply gp-frame-hot when hot=false", () => {
    const { container } = render(
      <Frame>
        <span>hi</span>
      </Frame>,
    );
    expect(container.querySelector(".gp-frame-hot")).toBeNull();
  });

  it("forwards className to the wrapper", () => {
    const { container } = render(
      <Frame className="xx">
        <span>hi</span>
      </Frame>,
    );
    const wrapper = container.querySelector(".gp-frame");
    expect(wrapper?.classList.contains("xx")).toBe(true);
  });
});
