import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Search, MoreVertical } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  sender: "user" | "provider";
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  participantName: string;
  participantRole: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      participantName: "Dr. Smith",
      participantRole: "Cardiologist",
      lastMessage: "Please keep monitoring your blood pressure daily",
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      unreadCount: 0,
      messages: [
        {
          id: "m1",
          sender: "provider",
          senderName: "Dr. Smith",
          content: "How are you feeling today?",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          read: true,
        },
        {
          id: "m2",
          sender: "user",
          senderName: "You",
          content: "I'm feeling better, thank you for asking!",
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
          read: true,
        },
        {
          id: "m3",
          sender: "provider",
          senderName: "Dr. Smith",
          content: "Please keep monitoring your blood pressure daily",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          read: true,
        },
      ],
    },
    {
      id: "2",
      participantName: "Dr. Johnson",
      participantRole: "General Practitioner",
      lastMessage: "Your lab results are ready",
      lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      unreadCount: 1,
      messages: [
        {
          id: "m4",
          sender: "provider",
          senderName: "Dr. Johnson",
          content: "Your lab results are ready",
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          read: false,
        },
      ],
    },
  ]);

  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    conversations[0]?.id || ""
  );
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      senderName: "You",
      content: messageInput,
      timestamp: new Date(),
      read: false,
    };

    setConversations(
      conversations.map((conv) => {
        if (conv.id === selectedConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: messageInput,
            lastMessageTime: new Date(),
          };
        }
        return conv;
      })
    );

    setMessageInput("");
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-2">
            Chat with your healthcare providers
          </p>
        </div>

        {/* Main Chat Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px] lg:h-[700px]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Conversations</CardTitle>
              {totalUnread > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalUnread} unread
                </span>
              )}
            </CardHeader>

            {/* Search */}
            <CardContent className="pb-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>

            {/* Conversation List */}
            <ScrollArea className="flex-1 border-t">
              <div className="space-y-1 p-4">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversationId === conv.id
                        ? "bg-primary/10"
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.participantAvatar} />
                        <AvatarFallback>
                          {conv.participantName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {conv.participantName}
                          </h4>
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.participantRole}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.lastMessage}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(conv.lastMessageTime, "MMM dd, HH:mm")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Window */}
          {selectedConversation ? (
            <Card className="lg:col-span-2 flex flex-col">
              {/* Header */}
              <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.participantAvatar} />
                    <AvatarFallback>
                      {selectedConversation.participantName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedConversation.participantName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.participantRole}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.sender === "provider" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {msg.senderName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted text-muted-foreground rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(msg.timestamp, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <CardContent className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="lg:col-span-2 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                <p className="text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
