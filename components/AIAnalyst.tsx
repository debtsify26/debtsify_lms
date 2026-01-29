import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { analyzeBusinessData } from '../services/geminiService';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAnalyst: React.FC = () => {
  const { loans, installments, transactions } = useData();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI Financial Analyst. Ask me about your cash flow, overdue payments, or profitable clients.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    const response = await analyzeBusinessData(userMsg, { loans, installments, transactions });
    
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
        <div className="bg-primary-100 p-2 rounded-lg">
           <Bot className="text-primary-600" size={24} />
        </div>
        <div>
           <h3 className="font-bold text-slate-800">Debtsify Intelligence</h3>
           <p className="text-xs text-slate-500">Powered by Gemini 3.0</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-700 text-white' : 'bg-primary-100 text-primary-600'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
             </div>
             <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' 
                ? 'bg-slate-700 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
             }`}>
               {m.content.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-500">
               <Loader2 size={16} className="animate-spin" />
               <span className="text-xs font-medium">Analyzing financials...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white">
         <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ask about your business..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button 
               type="submit" 
               disabled={isLoading || !input.trim()}
               className="bg-primary-600 text-white p-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
               <Send size={20} />
            </button>
         </div>
      </form>
    </div>
  );
};

export default AIAnalyst;