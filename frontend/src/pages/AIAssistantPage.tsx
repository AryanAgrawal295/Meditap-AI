import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Upload, Bot, User } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

function serializeMessages(messages: Message[]) {
  return JSON.stringify(
    messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }))
  );
}

function parseStoredMessages(rawValue: string | null): Message[] | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;

    return parsed.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    }));
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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentPatientId) {
      setMessages(initialMessages);
      return;
    }

    const storedChats = parseStoredMessages(localStorage.getItem(`${AI_CHAT_STORAGE_KEY}.${currentPatientId}`));
    setMessages(storedChats && storedChats.length > 0 ? storedChats : initialMessages);
  }, [currentPatientId]);

  useEffect(() => {
    if (!currentPatientId) {
      return;
    }

    localStorage.setItem(`${AI_CHAT_STORAGE_KEY}.${currentPatientId}`, serializeMessages(messages));
  }, [currentPatientId, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const answer = await askAssistant(userMessage.content);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formatAssistantContent(answer),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I could not process that request right now.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (currentPatientId) {
      localStorage.removeItem(`${AI_CHAT_STORAGE_KEY}.${currentPatientId}`);
    }
    setMessages(initialMessages);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)] lg:h-[calc(100vh-8rem)] max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl text-foreground">AI Assistant</h1>
            <p className="text-muted-foreground mt-1">Ask about history, schedules, adherence, and refills</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon">
              <Upload size={18} />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleClearChat}>
              <Trash2 size={18} />
            </Button>
          </div>
        </div>

        {/* Messages */}
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

        {/* Input */}
        <div className="flex gap-3 shrink-0 pb-20 lg:pb-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about medicines, history, schedules, or adherence..."
            className="input-medical flex-1 text-base"
          />
          <Button
            variant="medical"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
