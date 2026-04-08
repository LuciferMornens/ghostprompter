import { useScriptStore } from "@/store/scriptStore";

export function MarkdownEditor() {
  const content = useScriptStore((s) => s.script.content);
  const setContent = useScriptStore((s) => s.setContent);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      spellCheck
      placeholder="Write your script in Markdown..."
      className="w-full h-full resize-none bg-ghost-panel-2 text-ghost-text p-4 text-[14px] leading-relaxed outline-none border-none"
    />
  );
}
