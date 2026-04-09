import { useScriptStore } from "@/store/scriptStore";

export function MarkdownEditor() {
  const content = useScriptStore((s) => s.script.content);
  const setContent = useScriptStore((s) => s.setContent);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      spellCheck
      placeholder="Begin your script in markdown… headings, lists, bold — the teleprompter reads it all."
      className="w-full h-full resize-none outline-none border-none gp-scroll bg-transparent"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 13.5,
        lineHeight: 1.92,
        padding: "36px 42px",
        color: "var(--color-gp-paper-dim)",
        caretColor: "var(--color-gp-bronze)",
        letterSpacing: "0.002em",
        tabSize: 2,
      }}
    />
  );
}
