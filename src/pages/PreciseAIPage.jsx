import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PreciseTasks from '@/components/precise/PreciseTasks';
import PreciseKnowledge from '@/components/precise/PreciseKnowledge';
import PreciseContracts from '@/components/precise/PreciseContracts';
import { Bot, BookOpen, FileSignature, Mail, Wrench } from 'lucide-react';

export default function PreciseAIPage() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" />
          PreciseAI
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">ניהול משימות, התכתבויות וידע</p>
        <div className="flex gap-2 mt-3">
          <a
            href="https://outlook.office.com/mail/?realm=preciseai.ai&exsvurl=1&ll-cc=1033&modurl=0&url=%2fowa%2f%3frealm%253dpreciseai.ai%2526exsvurl%253d1%2526ll-cc%253d1033%2526modurl%253d0%2526login_hint%253damitk%252540preciseai.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            Outlook
          </a>
          <a
            href="https://preciseai.retool.com/folders/Prod%20Latest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Retool
          </a>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="tasks">משימות</TabsTrigger>
          <TabsTrigger value="contracts">
            <FileSignature className="w-4 h-4 ml-1" />
            חוזה ותשלומים
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpen className="w-4 h-4 ml-1" />
            ניהול ידע
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <PreciseTasks />
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <PreciseContracts />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <PreciseKnowledge />
        </TabsContent>
      </Tabs>
    </div>
  );
}