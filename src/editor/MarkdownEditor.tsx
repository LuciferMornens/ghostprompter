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
      className="w-full h-full resize-none outline-none border-none gp-scroll bg-transparent gp-editor-surface"
      style={{
        padding: "56px 68px 72px 68px",
        caretColor: "var(--color-gp-bronze)",
        tabSize: 2,
      }}
    />
  );
}
