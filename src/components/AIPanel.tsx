import { useState, useRef, useEffect, useCallback } from 'react';
import { useSchemaStore } from '../store/schema-store';
import { parseSchemaCommand, applyActions } from '../lib/ai-schema-parser';
import { generateFullMigration, generateDiffMigration } from '../lib/migration-generator';
import type { Schema } from '../types/schema';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIPanelProps {
  onClose: () => void;
}

const EXAMPLE_COMMANDS = [
  'create table users with id serial pk, name varchar(255), email varchar(255) unique, created_at timestamp',
  'add column phone varchar(20) to users',
  'create table orders with id serial pk, user_id integer, total decimal, status varchar(50)',
  'relationship orders.user_id and users.id 1:N',
  'remove column phone from users',
];

export function AIPanel({ onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: `**AI Schema Assistant**\n\nDescribe schema changes in natural language:\n\n• \`create table users with id serial pk, name text, email text unique\`\n• \`add column phone varchar(20) to users\`\n• \`relationship orders.user_id and users.id 1:N\`\n• \`remove column phone from users\`\n• \`delete table users\`\n\nType \`/migration\` to generate migration SQL.\nType \`/migration diff\` to compare with a saved version.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'migration'>('chat');
  const [migrationSQL, setMigrationSQL] = useState<{ up: string; down: string } | null>(null);
  const [migrationDialect, setMigrationDialect] = useState<'postgresql' | 'mysql'>('postgresql');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const enums = useSchemaStore((s) => s.enums);
  const groups = useSchemaStore((s) => s.groups);
  const addTable = useSchemaStore((s) => s.addTable);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const addColumn = useSchemaStore((s) => s.addColumn);
  const removeColumn = useSchemaStore((s) => s.removeColumn);
  const addRelationship = useSchemaStore((s) => s.addRelationship);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const schema: Schema = { tables, relationships, enums, groups };

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Handle special commands
    if (trimmed.startsWith('/migration')) {
      const migration = generateFullMigration(schema, migrationDialect);
      setMigrationSQL({ up: migration.up, down: migration.down });
      setActiveTab('migration');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-resp`,
          role: 'assistant',
          content: `📄 Migration SQL generated! Switch to the **Migration** tab to view and copy.`,
        },
      ]);
      return;
    }

    // Parse natural language command
    const actions = parseSchemaCommand(trimmed, schema);

    if (actions.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-resp`,
          role: 'assistant',
          content: `I couldn't understand that command. Try:\n• \`create table <name> with <columns>\`\n• \`add column <name> <type> to <table>\`\n• \`relationship <table>.<col> and <table>.<col>\`\n• \`delete table <name>\`\n• \`/migration\` for SQL generation`,
        },
      ]);
      return;
    }

    // Apply actions
    const results = applyActions(actions, schema, {
      addTable,
      removeTable,
      addColumn,
      removeColumn,
      addRelationship,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: results.join('\n'),
      },
    ]);
  }, [input, schema, migrationDialect, addTable, removeTable, addColumn, removeColumn, addRelationship]);

  const handleCopyMigration = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  const handleGenerateMigration = () => {
    const migration = generateFullMigration(schema, migrationDialect);
    setMigrationSQL({ up: migration.up, down: migration.down });
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="flex-1" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className="w-[480px] h-full flex flex-col border-l shadow-2xl animate-in slide-in-from-right"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
                <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
                <circle cx="12" cy="14" r="1" fill="#a855f7" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h2>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Schema commands & migrations</p>
            </div>
          </div>
          <button className="rounded-lg p-2 hover:bg-white/5 transition-all" style={{ color: 'var(--text-secondary)' }} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            className={`flex-1 px-4 py-2.5 text-xs font-bold tracking-wider transition-all ${activeTab === 'chat' ? 'text-purple-400 border-b-2 border-purple-400' : ''}`}
            style={activeTab !== 'chat' ? { color: 'var(--text-muted)' } : undefined}
            onClick={() => setActiveTab('chat')}
          >
            CHAT
          </button>
          <button
            className={`flex-1 px-4 py-2.5 text-xs font-bold tracking-wider transition-all ${activeTab === 'migration' ? 'text-purple-400 border-b-2 border-purple-400' : ''}`}
            style={activeTab !== 'migration' ? { color: 'var(--text-muted)' } : undefined}
            onClick={() => setActiveTab('migration')}
          >
            MIGRATION
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-purple-600/20 text-purple-200'
                        : msg.role === 'system'
                        ? ''
                        : ''
                    }`}
                    style={msg.role !== 'user' ? { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : undefined}
                  >
                    {msg.content.split(/(`[^`]+`)/).map((part, i) =>
                      part.startsWith('`') && part.endsWith('`') ? (
                        <code key={i} className="rounded bg-black/30 px-1.5 py-0.5 text-[11px] font-mono text-purple-300">
                          {part.slice(1, -1)}
                        </code>
                      ) : part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={i} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick examples */}
            {messages.length <= 1 && (
              <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                {EXAMPLE_COMMANDS.slice(0, 3).map((cmd, i) => (
                  <button
                    key={i}
                    className="rounded-lg border px-3 py-1.5 text-[10px] transition-all hover:bg-purple-500/10 hover:border-purple-500/30 truncate max-w-full"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    onClick={() => { setInput(cmd); inputRef.current?.focus(); }}
                  >
                    {cmd.length > 50 ? cmd.slice(0, 50) + '...' : cmd}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  placeholder="Describe schema changes..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-30"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Migration Tab */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Dialect selector */}
            <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dialect</span>
              <select
                className="rounded-lg border px-3 py-1.5 text-xs outline-none"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                value={migrationDialect}
                onChange={(e) => setMigrationDialect(e.target.value as 'postgresql' | 'mysql')}
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
              <button
                className="ml-auto rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500 active:scale-95 transition-all"
                onClick={handleGenerateMigration}
              >
                Generate
              </button>
            </div>

            {migrationSQL ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
                {/* UP */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">UP (Apply)</span>
                    <button
                      className="rounded-md px-2.5 py-1 text-[10px] font-bold text-green-400 hover:bg-green-500/10 transition-all"
                      onClick={() => handleCopyMigration(migrationSQL.up)}
                    >
                      Copy
                    </button>
                  </div>
                  <pre
                    className="rounded-xl border p-4 text-[11px] leading-relaxed overflow-x-auto font-mono"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {migrationSQL.up}
                  </pre>
                </div>

                {/* DOWN */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">DOWN (Rollback)</span>
                    <button
                      className="rounded-md px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                      onClick={() => handleCopyMigration(migrationSQL.down)}
                    >
                      Copy
                    </button>
                  </div>
                  <pre
                    className="rounded-xl border p-4 text-[11px] leading-relaxed overflow-x-auto font-mono"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {migrationSQL.down}
                  </pre>
                </div>

                {/* Download button */}
                <button
                  className="w-full rounded-xl border py-3 text-xs font-bold transition-all hover:bg-purple-500/10 hover:border-purple-500/30"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  onClick={() => {
                    const content = `-- UP\n${migrationSQL.up}\n\n-- DOWN\n${migrationSQL.down}`;
                    const blob = new Blob([content], { type: 'text/sql' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `migration_${new Date().toISOString().slice(0, 10)}.sql`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download .sql File
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click "Generate" to create migration SQL</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>from your current schema.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
