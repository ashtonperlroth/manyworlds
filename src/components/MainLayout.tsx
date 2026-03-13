'use client';

import { useEffect, useState } from 'react';
import { useConversationStore } from '@/lib/store/conversation-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import Topbar from './Topbar';
import Sidebar from './sidebar/Sidebar';
import ChatArea from './chat/ChatArea';
import SettingsPanel from './settings/SettingsPanel';
import TreeVisualization from './tree/TreeVisualization';

export default function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [treeVizOpen, setTreeVizOpen] = useState(false);
  const hydrate = useConversationStore((s) => s.hydrate);
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen);
  const theme = useSettingsStore((s) => s.theme);

  // On mobile, close sidebar by default
  useEffect(() => {
    if (window.innerWidth < 768) {
      useSettingsStore.getState().setSidebarOpen(false);
    }
  }, []);

  // Apply theme to html element
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  // Hydrate store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Keyboard shortcuts
  useEffect(() => {
    const createConversation = useConversationStore.getState().createConversation;
    const forkAtNode = useConversationStore.getState().forkAtNode;
    const toggleSidebar = useSettingsStore.getState().toggleSidebar;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      switch (e.key) {
        case 'n': {
          e.preventDefault();
          const { defaultModel } = useSettingsStore.getState();
          createConversation(defaultModel.provider, defaultModel.model);
          break;
        }
        case 'k': {
          e.preventDefault();
          const thread = useConversationStore.getState().getActiveThread();
          if (thread && thread.nodes.length > 0) {
            const lastNode = thread.nodes[thread.nodes.length - 1];
            forkAtNode(lastNode.id);
          }
          break;
        }
        case 'b': {
          e.preventDefault();
          toggleSidebar();
          break;
        }
        case ',': {
          e.preventDefault();
          setSettingsOpen((v) => !v);
          break;
        }
        case 'g': {
          e.preventDefault();
          setTreeVizOpen((v) => !v);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      <Topbar
        onSettings={() => setSettingsOpen(true)}
        onTreeViz={() => setTreeVizOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-200 ease-out overflow-hidden ${
            sidebarOpen ? 'w-sidebar' : 'w-0'
          }`}
        >
          {sidebarOpen && (
            <div className="h-full w-sidebar">
              <Sidebar />
            </div>
          )}
        </div>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <ChatArea />
        </main>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {treeVizOpen && <TreeVisualization onClose={() => setTreeVizOpen(false)} />}
    </div>
  );
}
