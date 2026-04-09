import { fireEvent, render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import NoInputView from "../no-input";

// Mock dependencies
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    unstyled: _unstyled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  } & Record<string, unknown>) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/loading", () => ({
  __esModule: true,
  default: ({ className }: { className?: string }) => (
    <div data-testid="loading" className={className} />
  ),
}));

describe("NoInputView", () => {
  const defaultProps = {
    isBuilding: false,
    sendMessage: jest.fn(),
    stopBuilding: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Run Flow button when not building", () => {
    render(<NoInputView {...defaultProps} />);
    expect(screen.getByTestId("button-send")).toBeInTheDocument();
    expect(screen.getByText(i18n.t("playground.runFlow"))).toBeInTheDocument();
  });

  it("renders Stop button with loading when building", () => {
    render(<NoInputView {...defaultProps} isBuilding={true} />);
    expect(screen.getByTestId("button-stop")).toBeInTheDocument();
    expect(screen.getByText(i18n.t("playground.stop"))).toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("calls sendMessage when Run Flow button is clicked", () => {
    const sendMessage = jest.fn();
    render(<NoInputView {...defaultProps} sendMessage={sendMessage} />);
    fireEvent.click(screen.getByTestId("button-send"));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("calls stopBuilding when Stop button is clicked", () => {
    const stopBuilding = jest.fn();
    render(
      <NoInputView
        {...defaultProps}
        isBuilding={true}
        stopBuilding={stopBuilding}
      />,
    );
    fireEvent.click(screen.getByTestId("button-stop"));
    expect(stopBuilding).toHaveBeenCalledTimes(1);
  });

  it("displays instruction text with link to documentation", () => {
    render(<NoInputView {...defaultProps} />);
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === "p" &&
          (element.textContent?.includes(
            i18n.t("playground.addChatInputPrefix"),
          ) ??
            false) &&
          (element.textContent?.includes(
            i18n.t("playground.addChatInputSuffix"),
          ) ??
            false),
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: i18n.t("playground.chatInputComponent"),
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://docs.langflow.org/components-io#chat-input",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });
});
