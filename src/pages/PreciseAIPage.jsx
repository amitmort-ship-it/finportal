import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PreciseTasks from '@/components/precise/PreciseTasks';
import PreciseKnowledge from '@/components/precise/PreciseKnowledge';
import { Bot, BookOpen } from 'lucide-react';

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
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="tasks">משימות</TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpen className="w-4 h-4 ml-1" />
            ניהול ידע
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <PreciseTasks />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          <PreciseKnowledge />
        </TabsContent>
      </Tabs>
    </div>
  );
}