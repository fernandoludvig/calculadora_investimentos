'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { TrendingUp, Clock, Target, AlertTriangle, Zap, Share2, Check, History, GitCompare, Trash2, Download, RefreshCw, Wifi, WifiOff, FileText, Table, FileSpreadsheet, Sun, Moon, Image as ImageIcon, Link, Menu, X } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface Goal {
  id: number;
  name: string;
  value: number;
  emoji: string;
}

interface Simulation {
  id: number;
  date: string;
  initialAmount: number;
  monthlyDeposit: number;
  years: number;
  investment: string;
  finalAmount: number;
  profit: number;
}

interface RateData {
  selic: number;
  cdi: number;
  ipca: number;
  lastUpdate: string;
  timestamp: number;
}

interface Investment {
  name: string;
  rate: number;
  color: string;
  description: string;
}

export default function InvestmentCalculator() {
  const [initialAmount, setInitialAmount] = useState(1000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(500);
  const [years, setYears] = useState(5);
  const [delayMonths, setDelayMonths] = useState(0);
  const [selectedInvestment, setSelectedInvestment] = useState('cdb');
  const [lostMoney, setLostMoney] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Estados para taxas reais
  const [ratesData, setRatesData] = useState<RateData | null>(null);
  const [loadingRates, setLoadingRates] = useState(true);
  const [ratesError, setRatesError] = useState(false);
  const ratesLoadedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [simulationHistory, setSimulationHistory] = useState<Simulation[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const [compareMode, setCompareMode] = useState(false);
  const [scenario2, setScenario2] = useState({
    initialAmount: 1000,
    monthlyDeposit: 300,
    years: 5,
    investment: 'poupanca'
  });


  const [customGoals, setCustomGoals] = useState<Goal[]>([
    { id: 1, name: 'iPhone 16 Pro', value: 8000, emoji: '📱' },
    { id: 2, name: 'Viagem Europa', value: 15000, emoji: '✈️' },
    { id: 3, name: 'Moto Nova', value: 25000, emoji: '🏍️' },
    { id: 4, name: 'Entrada Apê', value: 80000, emoji: '🏠' }
  ]);
  
  const [newGoal, setNewGoal] = useState({
    name: '',
    value: '',
    emoji: '🎯'
  });

  const [showGoalForm, setShowGoalForm] = useState(false);

  const emojiOptions = [
    '🎯', '💰', '🏠', '🚗', '🏍️', '✈️', '📱', '💻', '🎓', 
    '💍', '🏖️', '🎸', '📷', '⌚', '🎮', '🏋️', '🎨', '📚'
  ];

  const addCustomGoal = () => {
    if (newGoal.name && newGoal.value) {
      const goal: Goal = {
        id: Date.now(),
        name: newGoal.name,
        value: Number(newGoal.value),
        emoji: newGoal.emoji
      };
      setCustomGoals([...customGoals, goal]);
      setNewGoal({ name: '', value: '', emoji: '🎯' });
      setShowGoalForm(false);
    }
  };

  const removeGoal = (id: number) => {
    setCustomGoals(customGoals.filter(goal => goal.id !== id));
  };

  // Taxas fallback (caso API falhe)
  const fallbackRates: RateData = useMemo(() => ({
    selic: 0.15,      // 15.00% a.a.
    cdi: 0.149,       // 14.90% a.a.
    ipca: 0.0513,     // 5.13% (12 meses)
    lastUpdate: 'Estimativa (API indisponível)',
    timestamp: Date.now()
  }), []);

  // Buscar taxas reais do Banco Central
  const fetchRealRates = useCallback(async () => {
    setLoadingRates(true);
    setRatesError(false);

    try {
      console.log('🔄 Iniciando busca das taxas...');
      
      // Buscar dados das APIs do Banco Central
      const [selicRes, cdiRes, ipcaRes] = await Promise.all([
        // Selic Meta definida pelo Copom (anual)
        fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
        // CDI - taxa over anualizada
        fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'),
        // IPCA - últimos 12 meses
        fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json')
      ]);

      console.log('📡 Respostas recebidas:', {
        selic: selicRes.status,
        cdi: cdiRes.status,
        ipca: ipcaRes.status
      });

      if (!selicRes.ok || !cdiRes.ok || !ipcaRes.ok) {
        throw new Error(`Erro HTTP: Selic=${selicRes.status}, CDI=${cdiRes.status}, IPCA=${ipcaRes.status}`);
      }

      const selicData = await selicRes.json();
      const cdiData = await cdiRes.json();
      const ipcaData = await ipcaRes.json();

      console.log('📊 Dados brutos:', { selicData, cdiData, ipcaData: ipcaData.slice(0, 3) });

      // Processar Selic (vem em % anual, converter para decimal)
      const selicAnual = parseFloat(selicData[0]?.valor) / 100;
      console.log('🎯 Selic processada:', selicAnual, 'de', selicData[0]?.valor);
      
      // Processar CDI (vem em % anual, converter para decimal)
      const cdiAnual = parseFloat(cdiData[0]?.valor) / 100;
      console.log('🎯 CDI processado:', cdiAnual, 'de', cdiData[0]?.valor);
      
      // IPCA acumulado dos últimos 12 meses
      const ipcaAcumulado = ipcaData.reduce((acc: number, item: { valor: string }) => {
        const valor = parseFloat(item.valor) / 100;
        return acc * (1 + valor);
      }, 1) - 1;
      console.log('🎯 IPCA processado:', ipcaAcumulado);

      // Validar se os dados são válidos
      if (isNaN(selicAnual) || isNaN(cdiAnual) || isNaN(ipcaAcumulado)) {
        throw new Error('Dados inválidos recebidos da API');
      }

      const now = new Date();
      const newRatesData: RateData = {
        selic: selicAnual,
        cdi: cdiAnual,
        ipca: ipcaAcumulado,
        lastUpdate: now.toLocaleString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: now.getTime()
      };

      console.log('💾 Salvando dados:', newRatesData);
      setRatesData(newRatesData);
      
      // Salvar no cache
      localStorage.setItem('investmentRates', JSON.stringify(newRatesData));
      
      console.log('✅ Taxas atualizadas com sucesso:', {
        selic: `${(selicAnual * 100).toFixed(2)}%`,
        cdi: `${(cdiAnual * 100).toFixed(2)}%`,
        ipca: `${(ipcaAcumulado * 100).toFixed(2)}%`
      });
      
      toast.success('Taxas atualizadas com sucesso!', {
        description: `Selic: ${(selicAnual * 100).toFixed(2)}% | CDI: ${(cdiAnual * 100).toFixed(2)}% | IPCA: ${(ipcaAcumulado * 100).toFixed(2)}%`
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar taxas:', error);
      setRatesError(true);
      toast.error('Erro ao atualizar taxas', {
        description: 'Usando dados em cache ou estimativas'
      });
      
      // Usar cache se disponível, senão usar fallback
      const cached = localStorage.getItem('investmentRates');
      if (cached) {
        try {
          const cacheData = JSON.parse(cached);
          console.log('📦 Usando cache:', cacheData);
          setRatesData({
            ...cacheData,
            lastUpdate: cacheData.lastUpdate + ' (cache)'
          });
        } catch (cacheError) {
          console.error('❌ Erro ao ler cache:', cacheError);
          setRatesData(fallbackRates);
        }
      } else {
        console.log('🔄 Usando taxas fallback');
        setRatesData(fallbackRates);
      }
    } finally {
      setLoadingRates(false);
    }
  }, [fallbackRates]);

  // Verificar se precisa atualizar
  const shouldUpdate = (timestamp: number) => {
    const now = Date.now();
    const hoursSinceUpdate = (now - timestamp) / (1000 * 60 * 60);
    
    // Atualizar se passou mais de 24 horas
    return hoursSinceUpdate >= 24;
  };

  // Calcular taxas dos investimentos baseadas nas taxas reais
  const getInvestments = (): Record<string, Investment> => {
    const baseRates = ratesData || fallbackRates;
    
    // Poupança: 0,5% mês quando Selic > 8,5%
    const poupancaRate = baseRates.selic > 0.085 
      ? Math.pow(1.005, 12) - 1  // 6,17% a.a.
      : baseRates.selic * 0.7;

    return {
      poupanca: { 
        name: 'Poupança', 
        rate: poupancaRate,
        color: '#94a3b8',
        description: '0,5% mês + TR ≈ 6,17% a.a.'
      },
      cdb: { 
        name: 'CDB 115% CDI', 
        rate: baseRates.cdi * 1.15,
        color: '#10b981',
        description: `CDI ${(baseRates.cdi * 100).toFixed(2)}% × 1,15 = ${((baseRates.cdi * 1.15) * 100).toFixed(2)}%`
      },
      tesouroDireto: { 
        name: 'Tesouro Selic', 
        rate: baseRates.selic,
        color: '#3b82f6',
        description: `Acompanha Selic ${(baseRates.selic * 100).toFixed(2)}%`
      },
      tesouroIPCA: { 
        name: 'Tesouro IPCA+', 
        rate: baseRates.ipca + 0.068, // IPCA + ~6,8% juros reais
        color: '#8b5cf6',
        description: `IPCA ${(baseRates.ipca * 100).toFixed(2)}% + 6,8% real`
      },
      acoes: { 
        name: 'Ações (Ibovespa)', 
        rate: 0.10,
        color: '#f59e0b',
        description: 'Média histórica ~10% a.a.'
      },
      fundos: { 
        name: 'Fundos Multimercado', 
        rate: baseRates.cdi * 0.90,
        color: '#ec4899',
        description: `~90% CDI ≈ ${(baseRates.cdi * 0.90 * 100).toFixed(2)}%`
      }
    };
  };

  const investments = getInvestments();

  const calculateInvestment = (initial: number, monthly: number, years: number, rate: number, delayMonths: number = 0) => {
    const monthlyRate = rate / 12;
    const effectiveMonths = years * 12 - delayMonths;
    
    if (effectiveMonths <= 0) return 0;
    
    const futureValueInitial = initial * Math.pow(1 + monthlyRate, effectiveMonths);
    const futureValueMonthly = monthly * ((Math.pow(1 + monthlyRate, effectiveMonths) - 1) / monthlyRate);
    
    return futureValueInitial + futureValueMonthly;
  };

  const generateComparisonChartData = () => {
    const data = [];
    const maxMonths = Math.max(years * 12, scenario2.years * 12);
    
    for (let month = 0; month <= maxMonths; month++) {
      const dataPoint: { month: number; scenario1?: number; scenario2?: number; delayed?: number } = { month };
      
      if (month <= years * 12) {
        const value = calculateInvestment(
          initialAmount, 
          monthlyDeposit, 
          month / 12, 
          investments[selectedInvestment as keyof typeof investments].rate
        );
        dataPoint.scenario1 = Math.round(value);
      }
      
      if (compareMode && month <= scenario2.years * 12) {
        const value = calculateInvestment(
          scenario2.initialAmount, 
          scenario2.monthlyDeposit, 
          month / 12, 
          investments[scenario2.investment as keyof typeof investments].rate
        );
        dataPoint.scenario2 = Math.round(value);
      }
      
      if (!compareMode && delayMonths > 0 && month >= delayMonths) {
        const delayed = calculateInvestment(
          initialAmount, 
          monthlyDeposit, 
          (month - delayMonths) / 12, 
          investments[selectedInvestment as keyof typeof investments].rate
        );
        dataPoint.delayed = Math.round(delayed);
      }
      
      data.push(dataPoint);
    }
    
    return data;
  };

  const generateAllInvestmentsData = () => {
    const data = [];
    
    for (let month = 0; month <= years * 12; month++) {
      const dataPoint: { month: number; [key: string]: number } = { month };
      
      Object.keys(investments).forEach(key => {
        const value = calculateInvestment(
          initialAmount, 
          monthlyDeposit, 
          month / 12, 
          investments[key as keyof typeof investments].rate
        );
        dataPoint[key] = Math.round(value);
      });
      
      data.push(dataPoint);
    }
    
    return data;
  };

  // Carregar taxas ao montar o componente (apenas uma vez)
  useEffect(() => {
    if (ratesLoadedRef.current) return;
    
    const loadRates = async () => {
      console.log('🚀 Iniciando carregamento das taxas...');
      ratesLoadedRef.current = true;
      
      // Verificar cache primeiro
      const cached = localStorage.getItem('investmentRates');
      if (cached) {
        try {
          const cacheData = JSON.parse(cached);
          if (!shouldUpdate(cacheData.timestamp)) {
            console.log('📦 Usando cache válido');
            setRatesData(cacheData);
            setLoadingRates(false);
            return;
          }
        } catch {
          console.log('❌ Cache inválido, buscando novas taxas');
        }
      }
      
      await fetchRealRates();
    };

    loadRates();

    // Configurar atualização automática a cada 24 horas
    const interval = setInterval(() => {
      const cached = localStorage.getItem('investmentRates');
      if (cached) {
        const cacheData = JSON.parse(cached);
        if (shouldUpdate(cacheData.timestamp)) {
          fetchRealRates();
        }
      }
    }, 60 * 60 * 1000); // Verificar a cada hora

    return () => clearInterval(interval);
  }, [fetchRealRates]); // Adicionar fetchRealRates como dependência

  // PWA Install
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App instalado com sucesso!');
      }
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  // Salvar simulação no histórico
  const saveSimulation = () => {
    const simulation: Simulation = {
      id: Date.now(),
      date: new Date().toLocaleDateString('pt-BR'),
      investment: selectedInvestment,
      initialAmount,
      monthlyDeposit,
      years,
      finalAmount: calculateInvestment(initialAmount, monthlyDeposit, years, investments[selectedInvestment as keyof typeof investments].rate),
      profit: calculateInvestment(initialAmount, monthlyDeposit, years, investments[selectedInvestment as keyof typeof investments].rate) - (initialAmount + monthlyDeposit * 12 * years)
    };
    
    const newHistory = [simulation, ...simulationHistory].slice(0, 10);
    setSimulationHistory(newHistory);
    localStorage.setItem('simulationHistory', JSON.stringify(newHistory));
    toast.success('Simulação salva no histórico!');
  };

  // Carregar simulação do histórico
  const loadSimulation = (sim: Simulation) => {
    setSelectedInvestment(sim.investment);
    setInitialAmount(sim.initialAmount);
    setMonthlyDeposit(sim.monthlyDeposit);
    setYears(sim.years);
    toast.success('Simulação carregada!');
  };

  // Gerar imagem para redes sociais
  const generateShareImage = async () => {
    try {
      // Criar canvas com design melhorado
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }
      
      // Configurar tamanho do canvas
      canvas.width = 1200;
      canvas.height = 630; // Formato ideal para redes sociais
      
      // Definir cores baseadas no tema
      const isLight = theme === 'light';
      const bgGradient = isLight 
        ? ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        : ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      
      if (isLight) {
        bgGradient.addColorStop(0, '#f8fafc');
        bgGradient.addColorStop(1, '#e2e8f0');
      } else {
        bgGradient.addColorStop(0, '#0f172a');
        bgGradient.addColorStop(1, '#1e293b');
      }
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Header com gradiente
      const headerGradient = ctx.createLinearGradient(0, 0, 0, 120);
      if (isLight) {
        headerGradient.addColorStop(0, '#3b82f6');
        headerGradient.addColorStop(1, '#1d4ed8');
      } else {
        headerGradient.addColorStop(0, '#1e40af');
        headerGradient.addColorStop(1, '#1e3a8a');
      }
      
      ctx.fillStyle = headerGradient;
      ctx.fillRect(0, 0, canvas.width, 120);
      
      // Título principal
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('💰 O Preço de Esperar', canvas.width / 2, 60);
      
      // Subtítulo
      ctx.font = '20px Arial, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Calculadora de Investimentos Inteligente', canvas.width / 2, 90);
      
      // Card principal com sombra
      const cardX = 80;
      const cardY = 160;
      const cardWidth = canvas.width - 160;
      const cardHeight = 400;
      
      // Sombra do card
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(cardX + 5, cardY + 5, cardWidth, cardHeight);
      
      // Fundo do card
      ctx.fillStyle = isLight ? '#ffffff' : '#1e293b';
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      
      // Borda do card
      ctx.strokeStyle = isLight ? '#e2e8f0' : '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
      
      // Ícone do investimento
      const investmentEmojis: Record<string, string> = {
        poupanca: '🏦',
        cdb: '💳',
        tesouroDireto: '🏛️',
        tesouroIPCA: '📈',
        acoes: '📊',
        fundos: '🎯'
      };
      
      const investmentEmoji = investmentEmojis[selectedInvestment] || '💰';
      ctx.font = '60px Arial, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'left';
      ctx.fillText(investmentEmoji, cardX + 40, cardY + 80);
      
      // Nome do investimento
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.fillStyle = isLight ? '#1f2937' : '#ffffff';
      ctx.fillText(investments[selectedInvestment as keyof typeof investments].name, cardX + 140, cardY + 70);
      
      // Taxa do investimento
      ctx.font = '20px Arial, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`${(investments[selectedInvestment as keyof typeof investments].rate * 100).toFixed(2)}% ao ano`, cardX + 140, cardY + 100);
      
      // Linha separadora
      ctx.strokeStyle = isLight ? '#e5e7eb' : '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + 130);
      ctx.lineTo(cardX + cardWidth - 40, cardY + 130);
      ctx.stroke();
      
      // Parâmetros do investimento
      ctx.font = '18px Arial, sans-serif';
      ctx.fillStyle = isLight ? '#6b7280' : '#9ca3af';
      const params = [
        `Valor Inicial: R$ ${initialAmount.toLocaleString('pt-BR')}`,
        `Depósito Mensal: R$ ${monthlyDeposit.toLocaleString('pt-BR')}`,
        `Período: ${years} anos`
      ];
      
      params.forEach((param, index) => {
        ctx.fillText(param, cardX + 40, cardY + 160 + (index * 30));
      });
      
      
      // Linha separadora final
      ctx.strokeStyle = isLight ? '#e5e7eb' : '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + 260);
      ctx.lineTo(cardX + cardWidth - 40, cardY + 260);
      ctx.stroke();
      
      // Resultados destacados
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`R$ ${finalAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, cardX + 40, cardY + 310);
      
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`Lucro: R$ ${profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, cardX + 40, cardY + 350);
      
      // Badge de valor final
      ctx.fillStyle = '#10b981';
      ctx.fillRect(cardX + cardWidth - 180, cardY + 280, 140, 60);
      
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('Valor Final', cardX + cardWidth - 110, cardY + 305);
      
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(`R$ ${finalAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, cardX + cardWidth - 110, cardY + 330);
      
      // Rodapé com informações
      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = isLight ? '#6b7280' : '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText(`Gerado em ${new Date().toLocaleDateString('pt-BR')} • calculadora-investimentos.com`, canvas.width / 2, canvas.height - 30);
      
      // Download da imagem
      const link = document.createElement('a');
      link.download = `preco-de-esperar-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success('Imagem gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      toast.error('Erro ao gerar imagem');
    }
  };

  // Gerar link de compartilhamento
  const generateShareLink = () => {
    const params = new URLSearchParams({
      investment: selectedInvestment,
      initial: initialAmount.toString(),
      monthly: monthlyDeposit.toString(),
      years: years.toString()
    });
    
    const url = `${window.location.origin}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para compartilhar!');
  };

  useEffect(() => {
    if (delayMonths > 0) {
      const onTime = calculateInvestment(initialAmount, monthlyDeposit, years, investments[selectedInvestment as keyof typeof investments].rate);
      const delayed = calculateInvestment(initialAmount, monthlyDeposit, years, investments[selectedInvestment as keyof typeof investments].rate, delayMonths);
      setLostMoney(onTime - delayed);
    } else {
      setLostMoney(0);
    }
  }, [initialAmount, monthlyDeposit, years, delayMonths, selectedInvestment, ratesData, investments]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (showExportMenu) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showExportMenu]);

  // Carregar histórico de simulações
  useEffect(() => {
    const saved = localStorage.getItem('simulationHistory');
    if (saved) {
      setSimulationHistory(JSON.parse(saved));
    }
  }, []);

  // Detectar online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker para cache offline
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registrado'))
        .catch(() => console.log('Erro ao registrar Service Worker'));
    }
  }, []);

  // Carregar parâmetros de URL para compartilhamento
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('investment')) {
      setSelectedInvestment(params.get('investment')!);
      setInitialAmount(Number(params.get('initial')) || 1000);
      setMonthlyDeposit(Number(params.get('monthly')) || 300);
      setYears(Number(params.get('years')) || 5);
      toast.success('Simulação carregada do link!');
    }
  }, []);

  // Corrigir bug do tema ao carregar
  useEffect(() => {
    // Forçar aplicação do tema imediatamente
    const currentTheme = theme || 'dark';
    document.documentElement.className = currentTheme;
    document.body.className = currentTheme;
  }, [theme]);

  const finalAmount = calculateInvestment(initialAmount, monthlyDeposit, years, investments[selectedInvestment as keyof typeof investments].rate);
  const totalInvested = initialAmount + (monthlyDeposit * years * 12);
  const profit = finalAmount - totalInvested;

  const finalAmount2 = compareMode ? calculateInvestment(
    scenario2.initialAmount, 
    scenario2.monthlyDeposit, 
    scenario2.years, 
    investments[scenario2.investment as keyof typeof investments].rate
  ) : 0;
  const totalInvested2 = compareMode ? scenario2.initialAmount + (scenario2.monthlyDeposit * scenario2.years * 12) : 0;
  const profit2 = finalAmount2 - totalInvested2;

  const calculateMonthsToGoal = (goalValue: number, initial: number, monthly: number, rate: number) => {
    let months = 0;
    const monthlyRate = rate / 12;
    let accumulated = initial;
    
    while (accumulated < goalValue && months < 600) {
      accumulated = accumulated * (1 + monthlyRate) + monthly;
      months++;
    }
    
    return accumulated >= goalValue ? months : null;
  };

  const deleteSimulation = (id: number) => {
    setSimulationHistory(simulationHistory.filter(sim => sim.id !== id));
    localStorage.setItem('simulationHistory', JSON.stringify(simulationHistory.filter(sim => sim.id !== id)));
  };

  const shareResults = () => {
    const text = `💰 Simulação de Investimentos\n\n` +
      `📊 ${investments[selectedInvestment as keyof typeof investments].name}\n` +
      `💵 Investimento inicial: R$ ${initialAmount.toLocaleString('pt-BR')}\n` +
      `📅 Aporte mensal: R$ ${monthlyDeposit.toLocaleString('pt-BR')}\n` +
      `⏰ Período: ${years} anos\n\n` +
      `🎯 Resultado: R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `💚 Lucro: R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToJSON = () => {
    try {
      const data = {
        simulation: {
          date: new Date().toISOString(),
          initialAmount,
          monthlyDeposit,
          years,
          investment: selectedInvestment,
          finalAmount,
          totalInvested,
          profit
        },
        chartData: generateComparisonChartData(),
        goals: customGoals,
        simulationHistory
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulacao-investimento-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  };

  const exportToCSV = () => {
    try {
      const chartData = generateComparisonChartData();
      const csvData = [
        ['Mês', 'Valor Acumulado', 'Valor com Atraso'],
        ...chartData.map(point => [
          point.month,
          point.scenario1?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '',
          point.delayed?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || ''
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulacao-investimento-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar CSV. Tente novamente.');
    }
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Planilha 1: Dados da Simulação
      const simulationData = [
        ['Parâmetro', 'Valor'],
        ['Data da Simulação', new Date().toLocaleDateString('pt-BR')],
        ['Tipo de Investimento', investments[selectedInvestment as keyof typeof investments].name],
        ['Taxa Anual', `${(investments[selectedInvestment as keyof typeof investments].rate * 100).toFixed(1)}%`],
        ['Investimento Inicial', `R$ ${initialAmount.toLocaleString('pt-BR')}`],
        ['Aporte Mensal', `R$ ${monthlyDeposit.toLocaleString('pt-BR')}`],
        ['Período (anos)', years],
        ['Total Investido', `R$ ${totalInvested.toLocaleString('pt-BR')}`],
        ['Valor Final', `R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Lucro', `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Rentabilidade Total', `${((profit / totalInvested) * 100).toFixed(2)}%`]
      ];
      
      const simulationSheet = XLSX.utils.aoa_to_sheet(simulationData);
      XLSX.utils.book_append_sheet(workbook, simulationSheet, 'Simulação');

      // Planilha 2: Evolução Mensal
      const chartData = generateComparisonChartData();
      const evolutionData = [
        ['Mês', 'Valor Acumulado', 'Valor com Atraso'],
        ...chartData.map(point => [
          point.month,
          point.scenario1 || 0,
          point.delayed || 0
        ])
      ];
      
      const evolutionSheet = XLSX.utils.aoa_to_sheet(evolutionData);
      XLSX.utils.book_append_sheet(workbook, evolutionSheet, 'Evolução');

      // Planilha 3: Objetivos
      if (customGoals.length > 0) {
        const goalsData = [
          ['Meta', 'Valor', 'Emoji', 'Tempo para Atingir'],
          ...customGoals.map(goal => {
            const months = calculateMonthsToGoal(goal.value, initialAmount, monthlyDeposit, investments[selectedInvestment as keyof typeof investments].rate);
            return [
              goal.name,
              goal.value,
              goal.emoji,
              months ? `${Math.floor(months / 12)}a ${months % 12}m` : 'Não atingível'
            ];
          })
        ];
        
        const goalsSheet = XLSX.utils.aoa_to_sheet(goalsData);
        XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Objetivos');
      }

      XLSX.writeFile(workbook, `simulacao-investimento-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar Excel. Tente novamente.');
    }
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Título
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('O Preço de Esperar', 20, 20);
      pdf.setFontSize(12);
      pdf.text('Relatório de Simulação de Investimentos', 20, 30);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);

      // Dados da simulação
      pdf.setFontSize(14);
      pdf.text('Dados da Simulação', 20, 55);
      pdf.setFontSize(10);
      
      const simulationData = [
        `Tipo de Investimento: ${investments[selectedInvestment as keyof typeof investments].name}`,
        `Taxa Anual: ${(investments[selectedInvestment as keyof typeof investments].rate * 100).toFixed(1)}%`,
        `Investimento Inicial: R$ ${initialAmount.toLocaleString('pt-BR')}`,
        `Aporte Mensal: R$ ${monthlyDeposit.toLocaleString('pt-BR')}`,
        `Período: ${years} anos`,
        `Total Investido: R$ ${totalInvested.toLocaleString('pt-BR')}`,
        `Valor Final: R$ ${finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Lucro: R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Rentabilidade Total: ${((profit / totalInvested) * 100).toFixed(2)}%`
      ];

      simulationData.forEach((line, index) => {
        pdf.text(line, 20, 70 + (index * 5));
      });

      // Objetivos
      if (customGoals.length > 0) {
        pdf.setFontSize(14);
        pdf.text('Objetivos', 20, 120);
        pdf.setFontSize(10);
        
        let yPosition = 130;
        customGoals.forEach((goal, index) => {
          const months = calculateMonthsToGoal(goal.value, initialAmount, monthlyDeposit, investments[selectedInvestment as keyof typeof investments].rate);
          const timeText = months ? `${Math.floor(months / 12)}a ${months % 12}m` : 'Não atingível';
          const isAchievable = months !== null && months <= years * 12;
          
          // Nome do objetivo
          pdf.setFontSize(11);
          pdf.setTextColor(40, 40, 40);
          pdf.text(`${goal.name}`, 20, yPosition);
          
          // Valor
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          pdf.text(`Valor: R$ ${goal.value.toLocaleString('pt-BR')}`, 20, yPosition + 4);
          
          // Tempo para atingir
          pdf.setFontSize(10);
          if (isAchievable) {
            pdf.setTextColor(0, 150, 0); // Verde para atingível
            pdf.text(`Tempo para atingir: ${timeText}`, 20, yPosition + 8);
          } else {
            pdf.setTextColor(150, 0, 0); // Vermelho para não atingível
            pdf.text(`Meta não atingível no período de ${years} anos`, 20, yPosition + 8);
          }
          
          // Linha separadora
          if (index < customGoals.length - 1) {
            pdf.setDrawColor(200, 200, 200);
            pdf.line(20, yPosition + 12, 190, yPosition + 12);
          }
          
          yPosition += 18;
        });
      }

      // Disclaimer
      const disclaimerY = customGoals.length > 0 ? 130 + (customGoals.length * 18) + 20 : 200;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Este relatório é apenas para fins educacionais. Rentabilidade passada não garante resultados futuros.', 20, disclaimerY);
      pdf.text('Consulte sempre um profissional qualificado antes de tomar decisões de investimento.', 20, disclaimerY + 5);

      pdf.save(`simulacao-investimento-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Tente novamente.');
    }
  };

  const chartData = generateComparisonChartData();
  const allInvestmentsData = generateAllInvestmentsData();

  return (
    <div className={`min-h-screen p-4 md:p-8 ${theme === 'light' ? 'bg-gradient-to-br from-white to-gray-100 text-gray-900' : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="text-center space-y-4 py-8">
          <h1 className={`text-5xl md:text-6xl font-bold tracking-tight ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            O Preço de <span className="text-red-500">Esperar</span>
          </h1>
          <p className={`text-lg max-w-2xl mx-auto ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>
            Taxas atualizadas automaticamente via API do Banco Central
          </p>

          {/* Botão de instalação PWA */}
          {showInstallButton && (
            <div className="flex justify-center">
              <button
                onClick={handleInstallClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                Instalar App
              </button>
            </div>
          )}

          {/* Status das taxas */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {loadingRates ? (
              <Badge variant="outline" className="bg-yellow-950/30 border-yellow-800 text-yellow-400">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Atualizando taxas...
              </Badge>
            ) : ratesError ? (
              <Badge variant="outline" className="bg-red-950/30 border-red-800 text-red-400">
                <WifiOff className="w-3 h-3 mr-1" />
                Usando cache/estimativa
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-950/30 border-emerald-800 text-emerald-400">
                <Wifi className="w-3 h-3 mr-1" />
                Taxas oficiais BCB
              </Badge>
            )}
            
            <button
              onClick={fetchRealRates}
              disabled={loadingRates}
              className="flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingRates ? 'animate-spin' : ''}`} />
              Atualizar agora
            </button>
          </div>
          
          {/* Desktop: Botões sempre visíveis */}
          <div className="hidden md:flex flex-wrap justify-center gap-3 pt-4">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                compareMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              {compareMode ? 'Modo Normal' : 'Comparar Cenários'}
            </button>
            
            <button
              onClick={shareResults}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>

            <button
              onClick={saveSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
            >
              <History className="w-4 h-4" />
              Salvar
            </button>

            <button
              onClick={generateShareImage}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
            >
              <ImageIcon className="w-4 h-4" />
              Gerar Imagem
            </button>

            <button
              onClick={generateShareLink}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
            >
              <Link className="w-4 h-4" />
              Copiar Link
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              
              {showExportMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      exportToPDF();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700 transition-all first:rounded-t-lg"
                  >
                    <FileText className="w-4 h-4 text-red-400" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-slate-400">Relatório completo</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700 transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="font-medium">Excel</div>
                      <div className="text-xs text-slate-400">Planilhas detalhadas</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700 transition-all"
                  >
                    <Table className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-slate-400">Dados tabulares</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      exportToJSON();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700 transition-all last:rounded-b-lg"
                  >
                    <Download className="w-4 h-4 text-yellow-400" />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-slate-400">Dados completos</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Menu hamburger */}
          <div className="md:hidden pt-4">
            <div className="flex justify-center items-center gap-4">
              {/* Toggle de tema sempre visível */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </button>

              {/* Botão hamburger */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                Menu
              </button>
            </div>

            {/* Menu mobile expandido */}
            {showMobileMenu && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setCompareMode(!compareMode);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    compareMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <GitCompare className="w-4 h-4" />
                  {compareMode ? 'Modo Normal' : 'Comparar Cenários'}
                </button>

                <button
                  onClick={() => {
                    shareResults();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar Texto'}
                </button>

                <button
                  onClick={() => {
                    saveSimulation();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
                >
                  <History className="w-4 h-4" />
                  Salvar
                </button>

                <button
                  onClick={() => {
                    generateShareImage();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
                >
                  <ImageIcon className="w-4 h-4" />
                  Gerar Imagem
                </button>

                <button
                  onClick={() => {
                    generateShareLink();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
                >
                  <Link className="w-4 h-4" />
                  Copiar Link
                </button>

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowExportMenu(!showExportMenu);
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Banner com taxas atuais */}
        {loadingRates ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="animate-pulse bg-slate-700 h-3 w-12 rounded mx-auto mb-2"></div>
                    <div className="animate-pulse bg-slate-700 h-6 w-16 rounded mx-auto"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : ratesData && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-slate-400 text-xs mb-1">Selic</div>
                  <div className="text-white font-bold text-lg">
                    {(ratesData.selic * 100).toFixed(2)}% a.a.
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">CDI</div>
                  <div className="text-white font-bold text-lg">
                    {(ratesData.cdi * 100).toFixed(2)}% a.a.
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">IPCA (12m)</div>
                  <div className="text-white font-bold text-lg">
                    {(ratesData.ipca * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">CDB 115% CDI</div>
                  <div className="text-emerald-400 font-bold text-lg">
                    {(investments.cdb.rate * 100).toFixed(2)}% a.a.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {delayMonths > 0 && !compareMode && (
          <Alert className="bg-red-950/50 border-red-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertDescription className="text-lg">
              💸 Você perderia <span className="font-bold text-red-500 text-2xl">
                R$ {lostMoney.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span> esperando {delayMonths} meses para começar!
            </AlertDescription>
          </Alert>
        )}

        {compareMode && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 border-emerald-800/50">
              <CardHeader>
                <CardTitle className="text-emerald-400">Cenário 1</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-emerald-400">
                  Lucro: R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 border-blue-800/50">
              <CardHeader>
                <CardTitle className="text-blue-400">Cenário 2</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  R$ {finalAmount2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-blue-400">
                  Lucro: R$ {profit2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-4 pt-4 border-t border-blue-800/50">
                  <div className="text-slate-300 text-sm">
                    Diferença: <span className={`font-bold ${finalAmount > finalAmount2 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {finalAmount > finalAmount2 ? '+' : ''}
                      R$ {Math.abs(finalAmount - finalAmount2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          
          <Card className="lg:col-span-1 bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                {compareMode ? 'Cenário 1' : 'Sua Simulação'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo de Investimento</Label>
                <select
                  value={selectedInvestment}
                  onChange={(e) => setSelectedInvestment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(investments).map(([key, inv]) => (
                    <option key={key} value={key}>
                      {inv.name} - {(inv.rate * 100).toFixed(1)}% a.a.
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  {investments[selectedInvestment as keyof typeof investments].description}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Investimento Inicial</Label>
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono">R$</span>
                  <Input
                    type="number"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Number(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Aporte Mensal</Label>
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono">R$</span>
                  <Input
                    type="number"
                    value={monthlyDeposit}
                    onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-slate-300">Período</Label>
                  <span className="text-white font-bold">{years} anos</span>
                </div>
                <Slider
                  value={[years]}
                  onValueChange={(value) => setYears(value[0])}
                  min={1}
                  max={30}
                  step={1}
                  className="cursor-pointer"
                />
              </div>

              {!compareMode && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Adiar início em
                    </Label>
                    <span className="text-red-400 font-bold">{delayMonths} meses</span>
                  </div>
                  <Slider
                    value={[delayMonths]}
                    onValueChange={(value) => setDelayMonths(value[0])}
                    min={0}
                    max={24}
                    step={1}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-slate-500">
                    Arraste para ver o impacto de procrastinar
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/20 p-4 rounded-lg border border-emerald-800/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Você investiu</span>
                  <span className="text-white font-mono">
                    R$ {totalInvested.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 text-sm font-semibold">Você terá</span>
                  <span className="text-emerald-400 font-mono text-xl font-bold">
                    R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-800/30">
                  <span className="text-emerald-300 text-sm">Lucro puro</span>
                  <span className="text-emerald-300 font-mono font-bold">
                    +R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>

          {compareMode && (
            <Card className="lg:col-span-1 bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-blue-500" />
                  Cenário 2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo de Investimento</Label>
                  <select
                    value={scenario2.investment}
                    onChange={(e) => setScenario2({...scenario2, investment: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(investments).map(([key, inv]) => (
                      <option key={key} value={key}>
                        {inv.name} - {(inv.rate * 100).toFixed(1)}% a.a.
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Investimento Inicial</Label>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-mono">R$</span>
                    <Input
                      type="number"
                      value={scenario2.initialAmount}
                      onChange={(e) => setScenario2({...scenario2, initialAmount: Number(e.target.value)})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Aporte Mensal</Label>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-mono">R$</span>
                    <Input
                      type="number"
                      value={scenario2.monthlyDeposit}
                      onChange={(e) => setScenario2({...scenario2, monthlyDeposit: Number(e.target.value)})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-slate-300">Período</Label>
                    <span className="text-white font-bold">{scenario2.years} anos</span>
                  </div>
                  <Slider
                    value={[scenario2.years]}
                    onValueChange={(value) => setScenario2({...scenario2, years: value[0]})}
                    min={1}
                    max={30}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>

                <div className="bg-gradient-to-br from-blue-950/50 to-blue-900/20 p-4 rounded-lg border border-blue-800/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Você investiu</span>
                    <span className="text-white font-mono">
                      R$ {totalInvested2.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-400 text-sm font-semibold">Você terá</span>
                    <span className="text-blue-400 font-mono text-xl font-bold">
                      R$ {finalAmount2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-800/30">
                    <span className="text-blue-300 text-sm">Lucro puro</span>
                    <span className="text-blue-300 font-mono font-bold">
                      +R$ {profit2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          <div className={compareMode ? "lg:col-span-1 space-y-6" : "lg:col-span-2 space-y-6"}>
            
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Análise Gráfica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="evolution" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="evolution">
                      {compareMode ? 'Comparação' : 'Evolução'}
                    </TabsTrigger>
                    <TabsTrigger value="all">Todos Investimentos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="evolution" className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorScenario1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorScenario2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDelayed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          label={{ value: 'Meses', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number | string) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                          labelFormatter={(label) => `Mês ${label}`}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            paddingTop: '20px',
                            fontSize: '14px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="scenario1" 
                          stroke="#10b981" 
                          fillOpacity={1}
                          fill="url(#colorScenario1)"
                          name={compareMode ? "Cenário 1" : "Começando hoje"}
                          strokeWidth={2}
                        />
                        {compareMode ? (
                          <Area 
                            type="monotone" 
                            dataKey="scenario2" 
                            stroke="#3b82f6" 
                            fillOpacity={1}
                            fill="url(#colorScenario2)"
                            name="Cenário 2"
                            strokeWidth={2}
                          />
                        ) : delayMonths > 0 && (
                          <Area 
                            type="monotone" 
                            dataKey="delayed" 
                            stroke="#ef4444" 
                            fillOpacity={1}
                            fill="url(#colorDelayed)"
                            name={`Adiando ${delayMonths} meses`}
                            strokeWidth={2}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="all" className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={allInvestmentsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          label={{ value: 'Meses', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number | string) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                          labelFormatter={(label) => `Mês ${label}`}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            paddingTop: '20px',
                            fontSize: '14px'
                          }} 
                        />
                        {Object.entries(investments).map(([key, inv]) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={inv.color}
                            strokeWidth={2}
                            name={inv.name}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {!compareMode && (
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        Seus Objetivos
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        Veja em quanto tempo você atinge cada meta
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => setShowGoalForm(!showGoalForm)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm"
                    >
                      + Adicionar Meta
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {showGoalForm && (
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                      <h3 className="text-white font-semibold">Nova Meta</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-slate-300">Nome da Meta</Label>
                          <Input
                            placeholder="Ex: Notebook novo"
                            value={newGoal.name}
                            onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                            className="bg-slate-900 border-slate-700 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-slate-300">Valor (R$)</Label>
                          <Input
                            type="number"
                            placeholder="5000"
                            value={newGoal.value}
                            onChange={(e) => setNewGoal({...newGoal, value: e.target.value})}
                            className="bg-slate-900 border-slate-700 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Escolha um emoji</Label>
                        <div className="flex flex-wrap gap-2">
                          {emojiOptions.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setNewGoal({...newGoal, emoji})}
                              className={`text-2xl p-2 rounded-lg transition-all ${
                                newGoal.emoji === emoji 
                                  ? 'bg-blue-600 scale-110' 
                                  : 'bg-slate-800 hover:bg-slate-700'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={addCustomGoal}
                          disabled={!newGoal.name || !newGoal.value}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Adicionar Meta
                        </button>
                        <button
                          onClick={() => {
                            setShowGoalForm(false);
                            setNewGoal({ name: '', value: '', emoji: '🎯' });
                          }}
                          className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customGoals.map((goal) => {
                      const months = calculateMonthsToGoal(goal.value, initialAmount, monthlyDeposit, investments[selectedInvestment as keyof typeof investments].rate);
                      const canAchieve = months !== null && months <= years * 12;
                      const progress = Math.min((finalAmount / goal.value) * 100, 100);
                      
                      return (
                        <div 
                          key={goal.id}
                          className={`p-4 rounded-lg border transition-all relative group ${
                            canAchieve 
                              ? 'bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-600' 
                              : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                          }`}
                        >
                          <button
                            onClick={() => removeGoal(goal.id)}
                            className="absolute top-2 right-2 p-1 bg-red-950/50 text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50"
                            title="Remover meta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl">{goal.emoji}</span>
                              <div>
                                <div className="text-white font-semibold">{goal.name}</div>
                                <div className="text-slate-400 text-sm">
                                  R$ {goal.value.toLocaleString('pt-BR')}
                                </div>
                              </div>
                            </div>
                            {canAchieve && (
                              <div className="text-emerald-400 text-sm font-bold text-right">
                                {Math.floor(months / 12)}a {months % 12}m
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  canAchieve ? 'bg-emerald-500' : 'bg-slate-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-400 text-right">
                              {progress.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {customGoals.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma meta cadastrada ainda.</p>
                      <p className="text-sm">Clique em &quot;Adicionar Meta&quot; para começar!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {simulationHistory.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-500" />
                    Histórico de Simulações
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Últimas simulações salvas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {simulationHistory.map((sim: Simulation) => (
                      <div 
                        key={sim.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => loadSimulation(sim)}>
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{investments[sim.investment as keyof typeof investments].name.charAt(0)}</div>
                            <div>
                              <div className="text-white font-semibold text-sm">
                                {investments[sim.investment as keyof typeof investments].name}
                              </div>
                              <div className="text-slate-400 text-xs">
                                {sim.date} • {sim.years} anos
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold text-sm">
                            R$ {sim.finalAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-slate-400 text-xs">
                            +R$ {sim.profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSimulation(sim.id)}
                          className="ml-3 p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>

        <Card className="bg-slate-900/30 border-slate-800/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <p className="text-slate-400 text-sm">
                💡 <strong>Dica PWA:</strong> Adicione este site à tela inicial do seu celular para usar como app!
              </p>
              
              {ratesData && (
                <div className="max-w-3xl mx-auto p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <p className="text-emerald-400 text-sm font-semibold">
                      Última atualização: {ratesData.lastUpdate}
                    </p>
                  </div>
                  <p className="text-slate-300 text-xs mb-2">
                    <strong>Atualização automática:</strong> Selic e CDI (diário), IPCA (mensal)
                  </p>
                  <div className="grid md:grid-cols-3 gap-2 text-xs text-slate-400">
                    <div><strong>Selic:</strong> {(ratesData.selic * 100).toFixed(2)}% a.a.</div>
                    <div><strong>CDI:</strong> {(ratesData.cdi * 100).toFixed(2)}% a.a.</div>
                    <div><strong>IPCA (12m):</strong> {(ratesData.ipca * 100).toFixed(2)}%</div>
                  </div>
                  <p className="text-slate-500 text-xs mt-3">
                    <strong>Fontes:</strong> API BCB (SGS-11, SGS-12, SGS-433)
                  </p>
                </div>
              )}
              
              <p className="text-slate-500 text-xs">
                Valores para fins educacionais. Rentabilidade passada não garante resultados futuros.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Simulações */}
        {simulationHistory.length > 0 && (
          <Card className="bg-slate-900/30 border-slate-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <History className="w-5 h-5" />
                Histórico de Simulações
              </CardTitle>
              <CardDescription>
                {simulationHistory.length} de 10 simulações salvas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {simulationHistory.map((sim) => (
                  <div
                    key={sim.id}
                    className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-700/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        onClick={() => loadSimulation(sim)}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-semibold text-white">
                          {investments[sim.investment as keyof typeof investments].name}
                        </div>
                        <div className="text-sm text-slate-400">
                          {sim.date} • {sim.years} anos
                        </div>
                        <div className="text-xs text-slate-500">
                          R$ {sim.initialAmount.toLocaleString('pt-BR')} + R$ {sim.monthlyDeposit.toLocaleString('pt-BR')}/mês
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold">
                          R$ {sim.finalAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-slate-400">
                          +R$ {sim.profit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => loadSimulation(sim)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          title="Carregar simulação"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSimulation(sim.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Deletar simulação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Online/Offline */}
        <Card className="bg-slate-900/30 border-slate-800/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm">Online - Taxas atualizadas</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Offline - Modo cache</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}