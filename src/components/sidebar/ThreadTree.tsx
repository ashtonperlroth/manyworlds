'use client';

import type { ThreadTreeNode } from '@/types/conversation';
import ThreadNode from './ThreadNode';

interface ThreadTreeProps {
  root: ThreadTreeNode;
  activeThreadId: string | null;
}

export default function ThreadTree({ root, activeThreadId }: ThreadTreeProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <ThreadNode node={root} activeThreadId={activeThreadId} depth={0} />
    </div>
  );
}
