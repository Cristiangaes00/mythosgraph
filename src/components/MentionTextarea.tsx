import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  User,
  MapPin,
  Shield,
  Calendar,
  Sword,
  Sparkles,
  FileText,
  AtSign,
  ExternalLink,
  Plus,
} from 'lucide-react';
import type { Node, NodeType } from '../store';

export interface ParsedTextSegment {
  type: 'text' | 'mention';
  text: string;
  node?: Node;
  start: number;
  end: number;
}

export function getEntityIcon(type?: NodeType, size = 13): ReactNode {
  switch (type) {
    case 'character':
      return <User size={size} />;
    case 'location':
      return <MapPin size={size} />;
    case 'faction_entity':
      return <Shield size={size} />;
    case 'event':
      return <Calendar size={size} />;
    case 'item':
      return <Sword size={size} />;
    case 'magic':
      return <Sparkles size={size} />;
    default:
      return <FileText size={size} />;
  }
}

export function getEntityTypeBadge(type?: NodeType): {
  label: string;
  cls: string;
} {
  switch (type) {
    case 'character':
      return { label: 'Personaje', cls: 'character' };
    case 'location':
      return { label: 'Lugar', cls: 'location' };
    case 'faction_entity':
      return { label: 'Facción', cls: 'faction' };
    case 'event':
      return { label: 'Evento', cls: 'event' };
    case 'item':
      return { label: 'Artefacto', cls: 'item' };
    case 'magic':
      return { label: 'Magia', cls: 'magic' };
    case 'generic':
    case undefined:
      return { label: 'Lore', cls: 'generic' };
    default:
      return { label: type, cls: 'generic' };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BOUNDARY_AFTER_REGEX = /^($|[\s.,;:!?()[\]{}«»"'—\-/])/;
const BOUNDARY_BEFORE_REGEX = /(^|[\s([«"¡¿—\-/])@$/;

/**
 * Parses a text string and finds all `@EntityName` mentions matching existing nodes in the world.
 * Matches longest entity names first so multi-word names (e.g. `@Minas Tirith`) are matched completely.
 */
export function parseTextMentions(text: string, nodes: Node[]): ParsedTextSegment[] {
  if (!text) return [];

  const validNodes = nodes
    .filter((n) => n.data.label && n.data.label.trim().length > 0)
    .sort((a, b) => b.data.label.trim().length - a.data.label.trim().length);

  if (validNodes.length === 0) {
    return [{ type: 'text', text, start: 0, end: text.length }];
  }

  const segments: ParsedTextSegment[] = [];
  let cursor = 0;
  let plainStart = 0;

  while (cursor < text.length) {
    if (text[cursor] === '@') {
      const prefixAllowed =
        cursor === 0 || /[\s([«"¡¿—\-/]/.test(text[cursor - 1]);

      if (prefixAllowed) {
        const afterAt = text.slice(cursor + 1);
        const afterAtLower = afterAt.toLowerCase();

        let matchedNode: Node | undefined;
        let matchedLen = 0;

        for (const node of validNodes) {
          const label = node.data.label.trim();
          const labelLower = label.toLowerCase();
          if (afterAtLower.startsWith(labelLower)) {
            const charAfter = afterAt.slice(label.length, label.length + 1);
            if (BOUNDARY_AFTER_REGEX.test(charAfter)) {
              matchedNode = node;
              matchedLen = label.length;
              break;
            }
          }
        }

        if (matchedNode && matchedLen > 0) {
          if (cursor > plainStart) {
            segments.push({
              type: 'text',
              text: text.slice(plainStart, cursor),
              start: plainStart,
              end: cursor,
            });
          }

          const mentionEnd = cursor + 1 + matchedLen;
          segments.push({
            type: 'mention',
            text: text.slice(cursor, mentionEnd),
            node: matchedNode,
            start: cursor,
            end: mentionEnd,
          });

          cursor = mentionEnd;
          plainStart = cursor;
          continue;
        }
      }
    }
    cursor++;
  }

  if (plainStart < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(plainStart),
      start: plainStart,
      end: text.length,
    });
  }

  return segments;
}

/**
 * Converts a plain text string into editor HTML with native inline mention chips.
 */
export function textToEditorHtml(text: string, nodes: Node[]): string {
  if (!text) return '';
  const segments = parseTextMentions(text, nodes);

  const html = segments
    .map((seg) => {
      if (seg.type === 'mention' && seg.node) {
        const badge = getEntityTypeBadge(seg.node.data.type);
        const label = escapeHtml(seg.node.data.label.trim());
        const id = seg.node.id;
        return `<span contenteditable="false" class="mention-chip ${badge.cls}" data-node-id="${id}" data-label="${label}" title="Ir a ${label} (${badge.label})">@${label}</span>`;
      }
      return escapeHtml(seg.text).replace(/\n/g, '<br>');
    })
    .join('');

  return html;
}

/**
 * Converts editor HTML/DOM back to a clean plain text string with `@EntityName`.
 */
export function domToPlainText(element: HTMLElement): string {
  let result = '';

  function walk(node: globalThis.Node) {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {
      result += node.nodeValue || '';
      return;
    }

    if (node.nodeType === globalThis.Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      if (el.classList.contains('mention-chip')) {
        const label = el.getAttribute('data-label') || el.innerText.replace(/^@/, '');
        result += `@${label}`;
        return;
      }

      if (el.tagName === 'BR') {
        result += '\n';
        return;
      }

      const isBlock = [
        'DIV',
        'P',
        'H1',
        'H2',
        'H3',
        'H4',
        'H5',
        'H6',
        'LI',
      ].includes(el.tagName);

      if (isBlock && result.length > 0 && !result.endsWith('\n')) {
        result += '\n';
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i]);
      }

      if (isBlock && !result.endsWith('\n')) {
        result += '\n';
      }
    }
  }

  walk(element);
  return result;
}

/**
 * Renders text with inline clickable `@Entidad` badges.
 */
export function renderTextWithMentions(
  text: string,
  nodes: Node[],
  onNavigateNode: (nodeId: string) => void
): ReactNode {
  const segments = parseTextMentions(text, nodes);
  return segments.map((seg, idx) => {
    if (seg.type === 'mention' && seg.node) {
      const badge = getEntityTypeBadge(seg.node.data.type);
      return (
        <button
          key={`${seg.node.id}-${idx}`}
          type="button"
          className={`inline-mention-link ${badge.cls}`}
          onClick={(e) => {
            e.stopPropagation();
            onNavigateNode(seg.node!.id);
          }}
          title={`Ir a ${seg.node.data.label} (${badge.label})`}
        >
          {getEntityIcon(seg.node.data.type, 12)}
          <span>@{seg.node.data.label}</span>
        </button>
      );
    }
    return <span key={idx}>{seg.text}</span>;
  });
}

interface MentionTextareaProps {
  value: string;
  onChange: (newValue: string) => void;
  nodes: Node[];
  sourceNodeId?: string;
  onLinkNode: (targetNodeId: string, sourceNodeId?: string) => void;
  onNavigateNode: (targetNodeId: string) => void;
  onCreateAndLinkNode?: (label: string, sourceNodeId?: string) => Node | null;
  placeholder?: string;
  className?: string;
  showMentionFooter?: boolean;
  textareaRefExternal?: any;
}

export default function MentionTextarea({
  value,
  onChange,
  nodes,
  sourceNodeId,
  onLinkNode,
  onNavigateNode,
  onCreateAndLinkNode,
  placeholder,
  className,
  showMentionFooter = true,
}: MentionTextareaProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInternalUpdateRef = useRef(false);
  const internalValueRef = useRef(value);

  const [mentionTrigger, setMentionTrigger] = useState<{
    query: string;
    coords: { top: number; left: number };
    range: Range;
  } | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // All mentions currently detected in value
  const detectedMentions = useMemo(() => {
    const segments = parseTextMentions(value, nodes);
    const map = new Map<string, Node>();
    for (const seg of segments) {
      if (seg.type === 'mention' && seg.node) {
        map.set(seg.node.id, seg.node);
      }
    }
    return Array.from(map.values());
  }, [value, nodes]);

  // Sync external value to innerHTML when not initiated by user typing
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    internalValueRef.current = value;
    if (editorRef.current) {
      const currentDomText = domToPlainText(editorRef.current);
      if (currentDomText !== value) {
        editorRef.current.innerHTML = textToEditorHtml(value, nodes);
      }
    }
  }, [value, nodes]);

  // Initial render of editor innerHTML
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = textToEditorHtml(value, nodes);
    }
  }, []);

  // Filter nodes matching active @query
  const matchingNodes = useMemo(() => {
    if (!mentionTrigger) return [];
    const q = mentionTrigger.query.trim().toLowerCase();

    return nodes
      .filter((n) => {
        if (!n.data.label?.trim()) return false;
        if (!q) return true;
        const labelMatch = n.data.label.toLowerCase().includes(q);
        const typeBadge = getEntityTypeBadge(n.data.type).label.toLowerCase();
        const factionMatch =
          n.data.structuredData?.faction?.toLowerCase().includes(q) ?? false;
        return labelMatch || typeBadge.includes(q) || factionMatch;
      })
      .sort((a, b) => {
        if (a.id === sourceNodeId && b.id !== sourceNodeId) return 1;
        if (b.id === sourceNodeId && a.id !== sourceNodeId) return -1;
        if (q) {
          const aStarts = a.data.label.toLowerCase().startsWith(q);
          const bStarts = b.data.label.toLowerCase().startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
        }
        return a.data.label.localeCompare(b.data.label);
      })
      .slice(0, 8);
  }, [mentionTrigger, nodes, sourceNodeId]);

  const canCreateNew = useMemo(() => {
    if (!mentionTrigger || !onCreateAndLinkNode) return false;
    const q = mentionTrigger.query.trim();
    if (q.length < 2 || q.length > 36) return false;
    return !nodes.some(
      (n) => n.data.label.trim().toLowerCase() === q.toLowerCase()
    );
  }, [mentionTrigger, nodes, onCreateAndLinkNode]);

  const totalMenuCount = matchingNodes.length + (canCreateNew ? 1 : 0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionTrigger?.query]);

  // Close mention menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as globalThis.Node)) {
        setMentionTrigger(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const evaluateCaretState = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !editorRef.current) {
      setMentionTrigger(null);
      return;
    }

    const anchorNode = sel.anchorNode;
    const anchorOffset = sel.anchorOffset;

    if (!anchorNode || anchorNode.nodeType !== globalThis.Node.TEXT_NODE) {
      setMentionTrigger(null);
      return;
    }

    const textBefore = anchorNode.nodeValue?.slice(0, anchorOffset) || '';
    const atIndex = textBefore.lastIndexOf('@');

    if (atIndex !== -1) {
      const prefixBeforeAt = textBefore.slice(0, atIndex + 1);
      if (BOUNDARY_BEFORE_REGEX.test(prefixBeforeAt)) {
        const query = textBefore.slice(atIndex + 1);
        if (query.length <= 35 && !/[.,;:!?()[\]{}«»"']/.test(query)) {
          const wordCount = query.trim().split(/\s+/).filter(Boolean).length;
          const anyMatch = nodes.some((n) =>
            n.data.label.toLowerCase().includes(query.trim().toLowerCase())
          );

          if (query.length === 0 || anyMatch || wordCount <= 2) {
            try {
              const range = sel.getRangeAt(0).cloneRange();
              range.setStart(anchorNode, atIndex);
              range.setEnd(anchorNode, anchorOffset);

              const rect = range.getBoundingClientRect();
              const wrapperRect = wrapperRef.current?.getBoundingClientRect() || {
                top: 0,
                left: 0,
              };

              const top = rect.bottom - wrapperRect.top + 6;
              const left = Math.max(8, rect.left - wrapperRect.left);

              setMentionTrigger({
                query,
                coords: { top, left },
                range,
              });
              return;
            } catch {
              // ignore range errors
            }
          }
        }
      }
    }

    setMentionTrigger(null);
  }, [nodes]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const newText = domToPlainText(editorRef.current);
    internalValueRef.current = newText;
    isInternalUpdateRef.current = true;
    onChange(newText);

    // Auto-link any detected mention
    const segments = parseTextMentions(newText, nodes);
    for (const seg of segments) {
      if (seg.type === 'mention' && seg.node) {
        onLinkNode(seg.node.id, sourceNodeId);
      }
    }

    evaluateCaretState();
  };

  const handleSelectNode = (targetNode: Node) => {
    if (!mentionTrigger || !editorRef.current) return;

    const badge = getEntityTypeBadge(targetNode.data.type);
    const label = targetNode.data.label.trim();

    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.className = `mention-chip ${badge.cls}`;
    chip.setAttribute('data-node-id', targetNode.id);
    chip.setAttribute('data-label', label);
    chip.setAttribute('title', `Ir a ${label} (${badge.label})`);
    chip.innerText = `@${label}`;

    const space = document.createTextNode('\u00A0');

    const range = mentionTrigger.range;
    range.deleteContents();
    range.insertNode(space);
    range.insertNode(chip);

    // Place caret after space
    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.setEndAfter(space);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    onLinkNode(targetNode.id, sourceNodeId);
    setMentionTrigger(null);

    handleInput();
    editorRef.current.focus();
  };

  const handleCreateNewAndSelect = () => {
    if (!mentionTrigger || !onCreateAndLinkNode) return;
    const rawLabel = mentionTrigger.query.trim();
    if (!rawLabel) return;
    const created = onCreateAndLinkNode(rawLabel, sourceNodeId);
    if (created) {
      handleSelectNode(created);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionTrigger && totalMenuCount > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalMenuCount);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalMenuCount) % totalMenuCount);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex < matchingNodes.length) {
          handleSelectNode(matchingNodes[selectedIndex]);
        } else if (canCreateNew) {
          handleCreateNewAndSelect();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionTrigger(null);
        return;
      }
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const chip = target.closest('.mention-chip') as HTMLElement | null;

    if (chip) {
      const nodeId = chip.getAttribute('data-node-id');
      if (nodeId) {
        if (!e.altKey && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          onNavigateNode(nodeId);
          return;
        }
      }
    }

    evaluateCaretState();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, plainText);
  };

  return (
    <div ref={wrapperRef} className="mention-textarea-wrapper">
      {/* RICH CONTENTEDITABLE INLINE MENTION EDITOR */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={`mention-rich-editor ${className || ''}`}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleEditorClick}
        onKeyUp={evaluateCaretState}
        onPaste={handlePaste}
      />

      {/* FLOATING AUTOCOMPLETE MENU FOR @ */}
      {mentionTrigger && (matchingNodes.length > 0 || canCreateNew) && (
        <div
          className="mention-popover-menu"
          style={{
            top: `${mentionTrigger.coords.top}px`,
            left: `${mentionTrigger.coords.left}px`,
          }}
        >
          <div className="mention-popover-header">
            <AtSign size={12} />
            <span>Vincular elemento del mundo</span>
            <span className="mention-popover-hint">↑↓ Enter</span>
          </div>

          <div className="mention-popover-list">
            {matchingNodes.map((node, idx) => {
              const badge = getEntityTypeBadge(node.data.type);
              const isSelected = idx === selectedIndex;
              const faction = node.data.structuredData?.faction;

              return (
                <button
                  key={node.id}
                  type="button"
                  className={`mention-popover-item ${isSelected ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectNode(node);
                  }}
                >
                  <span className={`mention-item-icon ${badge.cls}`}>
                    {getEntityIcon(node.data.type, 14)}
                  </span>
                  <span className="mention-item-main">
                    <span className="mention-item-label">{node.data.label}</span>
                    {faction && (
                      <span className="mention-item-sub">{faction}</span>
                    )}
                  </span>
                  <span className={`mention-item-badge ${badge.cls}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}

            {canCreateNew && (
              <button
                type="button"
                className={`mention-popover-item create-new ${
                  selectedIndex === matchingNodes.length ? 'selected' : ''
                }`}
                onMouseEnter={() => setSelectedIndex(matchingNodes.length)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCreateNewAndSelect();
                }}
              >
                <span className="mention-item-icon generic">
                  <Plus size={14} />
                </span>
                <span className="mention-item-main">
                  <span className="mention-item-label">
                    Crear y vincular <strong>«{mentionTrigger.query.trim()}»</strong>
                  </span>
                </span>
                <span className="new-badge">NUEVO</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* FOOTER BAR WITH DETECTED @ MENTIONS AS CLICKABLE LINKS */}
      {showMentionFooter && detectedMentions.length > 0 && (
        <div className="mention-detected-bar">
          <span className="mention-detected-label">
            <AtSign size={12} />
            <span>Vínculos en este texto:</span>
          </span>
          <div className="mention-detected-pills">
            {detectedMentions.map((node) => {
              const badge = getEntityTypeBadge(node.data.type);
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`inline-mention-link ${badge.cls}`}
                  onClick={() => onNavigateNode(node.id)}
                  title={`Abrir ficha de ${node.data.label} (${badge.label})`}
                >
                  {getEntityIcon(node.data.type, 12)}
                  <span>@{node.data.label}</span>
                  <ExternalLink size={11} style={{ opacity: 0.7 }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
