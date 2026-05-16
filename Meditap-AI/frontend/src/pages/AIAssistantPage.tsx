import { useState, useRef, useMemo, useEffect } from 'react';
import { Send, Trash2, Upload, Bot, User, Menu, MoreHorizontal, Pin, Archive, Edit3, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  pinned?: boolean;
  archived?: boolean;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello! I'm the NFC Next Level AI assistant. I can answer questions about patient history, current medicines, previous prescriptions, adherence status, refill reminders, and medicine schedules.",
    timestamp: new Date(),
  },
];

const AI_CHAT_STORAGE_KEY = 'meditap.aiChat';

function createChatSession(
  title = 'New chat',
  messages: Message[] = initialMessages
): ChatSession {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    messages,
    createdAt: new Date().toISOString(),
    pinned: false,
    archived: false,
  };
}

function createSessionTitle(messages: Message[]) {
  const firstUser = messages.find((message) => message.role === 'user');
  if (!firstUser) return 'New chat';
  const content = firstUser.content.trim();
  return content.length > 28 ? `${content.slice(0, 25).trim()}...` : content;
}

function serializeSessions(sessions: ChatSession[], activeSessionId: string) {
  return JSON.stringify({ sessions, activeSessionId });
}

function parseStoredSessions(rawValue: string | null): { sessions: ChatSession[]; activeSessionId: string } | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      sessions: Array<{
        id: string;
        title: string;
        messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>;
        createdAt: string;
        pinned?: boolean;
        archived?: boolean;
      }>;
      activeSessionId: string;
    };

    return {
      sessions: parsed.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        })),
        pinned: session.pinned ?? false,
        archived: session.archived ?? false,
      })),
      activeSessionId: parsed.activeSessionId,
    };
  } catch {
    return null;
  }
}

function formatAssistantContent(content: string) {
  return content
    .replace(/\*\*/g, '')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function AIAssistantPage() {
  const { askAssistant, currentPatientId } = useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const activeSession = useMemo(() => {
    return sessions.find((session) => session.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  const displayedSessions = useMemo(() => {
    return sessions
      .filter((session) => !session.archived)
      .sort((a, b) => {
        if (a.pinned === b.pinned) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.pinned ? -1 : 1;
      });
  }, [sessions]);

  const archivedSessions = useMemo(() => {
    return sessions
      .filter((session) => session.archived)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        // Auto-send after speech recognition
        setTimeout(() => handleSend(), 500);
      };
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    if (speechSynthesis) {
      synthRef.current = speechSynthesis;
    }

    setSpeechSupported(!!SpeechRecognition && !!speechSynthesis);
  }, []);

  useEffect(() => {
    if (!currentPatientId) {
      setSessions([]);
      setActiveSessionId('');
      setMessages(initialMessages);
      return;
    }

    const storedChats = parseStoredSessions(localStorage.getItem(`${AI_CHAT_STORAGE_KEY}.${currentPatientId}`));
    if (storedChats && storedChats.sessions.length > 0) {
      setSessions(storedChats.sessions);
      setActiveSessionId(storedChats.activeSessionId || storedChats.sessions[0].id);
      const selected = storedChats.sessions.find((session) => session.id === storedChats.activeSessionId) || storedChats.sessions[0];
      setMessages(selected.messages);
    } else {
      const newSession = createChatSession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages(newSession.messages);
    }
  }, [currentPatientId]);

  useEffect(() => {
    if (!currentPatientId) return;
    localStorage.setItem(
      `${AI_CHAT_STORAGE_KEY}.${currentPatientId}`,
      serializeSessions(sessions, activeSession?.id || '')
    );
  }, [currentPatientId, sessions, activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.messages === messages) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title: createSessionTitle(messages),
              messages,
            }
          : session
      )
    );
  }, [messages, activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewChat = () => {
    const newSession = createChatSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const answer = await askAssistant(userMessage.content);
      const assistantMessage: Message = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: formatAssistantContent(answer),
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, assistantMessage]);
      
      // Auto-speak the response if speech is supported
      if (speechSupported) {
        speakText(formatAssistantContent(answer));
      }
    } catch (error) {
      const assistantMessage: Message = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I could not process that request right now.',
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (!activeSession) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title: 'New chat',
              messages: initialMessages,
            }
          : session
      )
    );

    setMessages(initialMessages);
  };

  const renameSession = (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    const newTitle = window.prompt('Enter a new title for this chat', session.title);
    if (!newTitle || !newTitle.trim()) return;

    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              title: newTitle.trim(),
            }
          : item
      )
    );
  };

  const togglePinSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              pinned: !item.pinned,
            }
          : item
      )
    );
  };

  const archiveSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              archived: true,
            }
          : item
      )
    );

    if (activeSessionId === sessionId) {
      const nextSession = sessions.find((item) => item.id !== sessionId && !item.archived);
      if (nextSession) {
        setActiveSessionId(nextSession.id);
        setMessages(nextSession.messages);
      } else {
        const newSession = createChatSession();
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setMessages(newSession.messages);
      }
    }
  };

  const unarchiveSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((item) =>
        item.id === sessionId
          ? {
              ...item,
              archived: false,
            }
          : item
      )
    );
  };

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((session) => session.id !== sessionId);
      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id);
          setMessages(updated[0].messages);
        } else {
          const newSession = createChatSession();
          setMessages(newSession.messages);
          setActiveSessionId(newSession.id);
          return [newSession];
        }
      }
      return updated;
    });
  };

  const selectSession = (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    setActiveSessionId(session.id);
    setMessages(session.messages);
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
  };

  const speakText = (text: string) => {
    if (!synthRef.current || isSpeaking) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className={cn('grid gap-6', sidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-[260px_1fr]')}>
        {!sidebarCollapsed && (
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <Button variant="outline" className="flex-1" onClick={createNewChat}>
                  New Chat
                </Button>
              </div>
              <div className="space-y-2">
                {displayedSessions.map((session) => {
                  const isActive = session.id === activeSession?.id;
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        'w-full rounded-2xl border px-3 py-3 transition-all duration-200',
                        isActive ? 'bg-primary text-primary-foreground shadow-medical border-primary' : 'bg-background text-foreground border-border'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectSession(session.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{session.title || 'New chat'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(session.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="rounded-md p-2 text-muted-foreground hover:bg-secondary/70"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Chat actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => renameSession(session.id)}>
                                <Edit3 className="mr-2 h-4 w-4" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => togglePinSession(session.id)}>
                                <Pin className="mr-2 h-4 w-4" /> {session.pinned ? 'Unpin' : 'Pin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => archiveSession(session.id)}>
                                <Archive className="mr-2 h-4 w-4" /> Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => deleteSession(session.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </button>
                    </div>
                  );
                })}

                {archivedSessions.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-medium text-muted-foreground">Archived</p>
                    </div>
                    <div className="space-y-2">
                      {archivedSessions.map((session) => (
                        <div
                          key={session.id}
                          className="w-full rounded-2xl border border-border bg-card px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => selectSession(session.id)}
                              className="min-w-0 text-left"
                            >
                              <p className="font-medium truncate">{session.title || 'New chat'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(session.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="rounded-md p-2 text-muted-foreground hover:bg-secondary/70">
                                  <MoreHorizontal size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Archived chat</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => unarchiveSession(session.id)}>
                                  <Archive className="mr-2 h-4 w-4" /> Unarchive
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => deleteSession(session.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        <main className="flex flex-col h-[calc(100vh-10rem)] lg:h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="font-display text-3xl lg:text-4xl text-foreground">AI Assistant</h1>
              <p className="text-muted-foreground mt-1">Ask about history, schedules, adherence, and refills in your language.</p>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="rounded-full"
              >
                <Menu size={18} />
              </Button>
              <Button variant="secondary" size="icon">
                <Upload size={18} />
              </Button>
              <Button variant="secondary" size="icon" onClick={handleClearChat}>
                <Trash2 size={18} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 animate-slide-up',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {message.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div
                  className={cn(
                    'max-w-[75%] px-4 py-3 rounded-2xl',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  )}
                >
                  <p className="text-sm lg:text-base whitespace-pre-wrap break-words leading-7">{message.content}</p>
                  <span className="text-xs opacity-60 mt-2 block">
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Bot size={18} />
                </div>
                <div className="bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-3 shrink-0 pb-20 lg:pb-0">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening... Speak now" : "Ask about medicines, history, schedules, or adherence..."}
                className={cn(
                  "input-medical flex-1 text-base pr-12",
                  isListening && "border-red-300 bg-red-50"
                )}
              />
              {speechSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8",
                    isListening && "text-red-500 animate-pulse"
                  )}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </Button>
              )}
            </div>
            <Button
              variant="medical"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12"
            >
              <Send size={20} />
            </Button>
            {speechSupported && (
              <Button
                variant="outline"
                size="icon"
                onClick={isSpeaking ? stopSpeaking : () => speakText(messages[messages.length - 1]?.content || "")}
                disabled={messages.length === 0}
                className={cn(
                  "w-12 h-12",
                  isSpeaking && "text-blue-500 animate-pulse"
                )}
                title={isSpeaking ? "Stop speaking" : "Speak last response"}
              >
                {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </Button>
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
