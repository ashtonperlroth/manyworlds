'use client';

import { useState, useEffect, useRef } from 'react';
import { GitBranch, X } from 'lucide-react';
import { useConversationStore } from '@/lib/store/conversation-store';
import ModelSelector from '@/components/ui/ModelSelector';
import type { ProviderId } from '@/types/conversation';

interface ForkDialogProps {
  nodeId: string;
  currentProvider: ProviderId;
  currentModel: string;
  onClose(): void;
}

export default function ForkDialog({
  nodeId,
  currentProvider,
  currentModel,
  onClose,
}: ForkDialogProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<ProviderId>(currentProvider);
  const [model, setModel] = useState(currentModel);
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const forkAtNode = useConversationStore((s) => s.forkAtNode);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleFork = () => {
    setAnimating(true);
    setTimeout(() => {
      forkAtNode(nodeId, name.trim() || undefined, provider, model);
      onClose();
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFork();
    if (e.key === 'Escape') onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-bg-inverse/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-bg-primary border border-accent-muted/40 rounded-2xl shadow-warm-xl p-5 ${
          animating ? 'animate-fork-split' : 'animate-fade-in-up'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/15 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-accent-primary" strokeWidth={2} />
            </div>
            <h2 className="font-display text-base font-semibold text-text-primary">
              Fork Conversation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-4 leading-relaxed">
          Create a new branch from this message. The fork inherits all history up to this point.
        </p>

        {/* Name input */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
            Fork name (optional)
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Auto-named from first message"
            className="w-full bg-bg-secondary border border-accent-muted/40 rounded-xl px-3 py-2 text-base font-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary/60 transition-colors"
          />
        </div>

        {/* Model selector */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-1.5">
            Model
          </label>
          <ModelSelector
            provider={provider}
            model={model}
            onChange={(p, m) => {
              setProvider(p);
              setModel(m);
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-accent-muted/40 text-base font-body font-semibold text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFork}
            className="flex-1 py-2 rounded-xl bg-accent-primary text-text-inverse text-base font-body font-semibold hover:bg-accent-hover transition-colors shadow-warm"
          >
            Fork
          </button>
        </div>
      </div>
    </>
  );
}
