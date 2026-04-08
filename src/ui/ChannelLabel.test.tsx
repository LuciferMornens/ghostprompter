import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ChannelLabel } from "./ChannelLabel";

describe("<ChannelLabel />", () => {
  it("renders the channel code in uppercase text", () => {
    const { getByText } = render(<ChannelLabel code="CH.01" label="SCRIPT" />);
    expect(getByText("CH.01")).toBeInTheDocument();
    expect(getByText("SCRIPT")).toBeInTheDocument();
  });

  it("applies the gp-channel class", () => {
    const { container } = render(
      <ChannelLabel code="CH.01" label="SCRIPT" />,
    );
    expect(container.querySelector(".gp-channel")).not.toBeNull();
  });

  it("applies amber tone class when tone='amber'", () => {
    const { container } = render(
      <ChannelLabel code="CH.02" label="LIVE" tone="amber" />,
    );
    expect(container.querySelector(".gp-channel--amber")).not.toBeNull();
  });

  it("applies mute tone class when tone='mute'", () => {
    const { container } = render(
      <ChannelLabel code="CH.03" label="IDLE" tone="mute" />,
    );
    expect(container.querySelector(".gp-channel--mute")).not.toBeNull();
  });

  it("renders a separator between code and label", () => {
    const { container } = render(
      <ChannelLabel code="CH.01" label="SCRIPT" />,
    );
    // The component renders " / " between the two parts
    expect(container.textContent).toContain("/");
  });

  it("passes through className", () => {
    const { container } = render(
      <ChannelLabel code="CH" label="X" className="extra-class" />,
    );
    expect(container.querySelector(".extra-class")).not.toBeNull();
  });
});
