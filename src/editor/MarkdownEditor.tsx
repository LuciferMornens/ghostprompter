import { useScriptStore } from "@/store/scriptStore";

export function MarkdownEditor() {
  const content = useScriptStore((s) => s.script.content);
  const setContent = useScriptStore((s) => s.setContent);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      spellCheck
      placeholder={
        "# New script\n\nWrite your script in markdown. Headings, lists, bold — the teleprompter reads it all."
      }
      className="w-full h-full resize-none outline-none border-none gp-scroll"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "14px",
        lineHeight: 1.7,
        padding: "24px 28px",
        background: "var(--color-gp-surface)",
        color: "var(--color-gp-paper-dim)",
        caretColor: "var(--color-gp-amber)",
      }}
    />
  );
}
