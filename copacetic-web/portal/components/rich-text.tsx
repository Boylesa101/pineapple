'use client';
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type Doc = { type: 'doc'; content?: unknown[] };

// Headings, lists, links and quotes only. Output is Tiptap JSON (never HTML), and the server
// re-validates it against lib/content/richtext.ts.
export function RichText({
  id, label, value, onChange, readOnly = false, hint,
}: { id: string; label: string; value: Doc | null; onChange: (doc: Doc) => void; readOnly?: boolean; hint?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'], defaultProtocol: 'https' },
      }),
    ],
    content: (value ?? { type: 'doc', content: [] }) as JSONContent,
    editorProps: { attributes: { class: 'rt-body', 'aria-labelledby': `${id}-label`, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as Doc),
  });
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
            bold: e.isActive('bold'), italic: e.isActive('italic'), ul: e.isActive('bulletList'),
            ol: e.isActive('orderedList'), quote: e.isActive('blockquote'), link: e.isActive('link'),
          }
        : null,
  });

  const tool = (name: string, on: boolean | undefined, run: () => void) => (
    <button type="button" className={`rt-btn${on ? ' on' : ''}`} aria-pressed={!!on} onClick={run} disabled={!editor}>
      {name}
    </button>
  );
  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const href = window.prompt('Link address (https://… or mailto:…)', prev ?? 'https://');
    if (href === null) return;
    if (!href.trim()) return editor.chain().focus().unsetLink().run();
    if (!/^(https?:\/\/|mailto:)/i.test(href.trim())) return window.alert('Links must start with https://, http:// or mailto:');
    editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
  };

  return (
    <div className="field">
      <div id={`${id}-label`} className="label">{label}</div>
      {hint && <p className="hint" style={{ marginTop: 0, marginBottom: 6 }}>{hint}</p>}
      <div className={`rt${readOnly ? ' ro' : ''}`}>
        {!readOnly && editor && (
          <div className="rt-bar" role="toolbar" aria-label={`${label} formatting`}>
            {tool('H2', active?.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            {tool('H3', active?.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            {tool('Bold', active?.bold, () => editor.chain().focus().toggleBold().run())}
            {tool('Italic', active?.italic, () => editor.chain().focus().toggleItalic().run())}
            {tool('• List', active?.ul, () => editor.chain().focus().toggleBulletList().run())}
            {tool('1. List', active?.ol, () => editor.chain().focus().toggleOrderedList().run())}
            {tool('Quote', active?.quote, () => editor.chain().focus().toggleBlockquote().run())}
            {tool('Link', active?.link, setLink)}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
