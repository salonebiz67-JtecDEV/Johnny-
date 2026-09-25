import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse code blocks with ```language ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockIndex = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(
        <span key={`text-${lastIndex}`}>{renderSimpleMarkdown(textBefore)}</span>
      );
    }

    const language = match[1] || 'code';
    const code = match[2];
    const currentIndex = blockIndex++;

    parts.push(
      <div key={`code-block-${currentIndex}`} className="my-3 rounded-xl overflow-hidden border border-[#292929] bg-[#0c0c0c]">
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#151515] border-b border-[#242424] text-[11px] text-[#929292] font-mono">
          <span>{language}</span>
          <button
            onClick={() => handleCopyCode(code, currentIndex)}
            className="flex items-center gap-1 hover:text-[#F5F5F5] transition-colors"
          >
            {copiedIndex === currentIndex ? (
              <>
                <Check className="w-3 h-3 text-[#D6B15E]" />
                <span className="text-[#D6B15E]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy code</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3.5 text-xs text-[#F5F5F5] font-mono overflow-x-auto leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(
      <span key={`text-end`}>{renderSimpleMarkdown(remainingText)}</span>
    );
  }

  return <div className="josa-prose select-text">{parts}</div>;
};

// Render simple markdown: bold, headings, inline code, bullet points
function renderSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Empty line
    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    // Heading 3: ###
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1">
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
    }
    // Heading 2: ##
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-base font-bold text-white mt-4 mb-1.5">
          {renderInlineFormatting(line.slice(3))}
        </h2>
      );
    }
    // Heading 1: #
    if (line.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-lg font-bold text-white mt-5 mb-2">
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
    }

    // Bullet point: * or -
    if (/^[\*\-]\s+/.test(line)) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D6B15E] mt-2 shrink-0" />
          <span className="text-sm text-[#F5F5F5]">
            {renderInlineFormatting(line.replace(/^[\*\-]\s+/, ''))}
          </span>
        </div>
      );
    }

    // Numbered list: 1.
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="text-xs font-mono font-bold text-[#D6B15E] mt-0.5 shrink-0">
            {numMatch[1]}.
          </span>
          <span className="text-sm text-[#F5F5F5]">
            {renderInlineFormatting(numMatch[2])}
          </span>
        </div>
      );
    }

    // Regular paragraph
    return (
      <p key={idx} className="text-sm text-[#F5F5F5] leading-relaxed my-1">
        {renderInlineFormatting(line)}
      </p>
    );
  });
}

// Inline formatting: **bold**, `code`, *italic*
function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={i}
          className="bg-[#1e1e1e] border border-[#2e2e2e] text-[#F0D58A] px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={i} className="italic text-[#E5E5E5]">{token.slice(1, -1)}</em>;
    }
    return token;
  });
}
