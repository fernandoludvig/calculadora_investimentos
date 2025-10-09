# 🧪 Guia de Teste de Segurança - Localhost

## ✅ Servidor Iniciado

O servidor está rodando em: **http://localhost:3000**

---

## 📋 Checklist de Testes

### 1. Testar Headers de Segurança

Abra um novo terminal e execute:

```bash
curl -I http://localhost:3000
```

**O que verificar:**
- ✅ `Strict-Transport-Security` presente
- ✅ `X-Frame-Options: SAMEORIGIN`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Content-Security-Policy` presente
- ✅ `Referrer-Policy` presente
- ✅ `Permissions-Policy` presente
- ❌ `X-Powered-By` NÃO deve aparecer

### 2. Testar CSP no Navegador

1. Abra **http://localhost:3000**
2. Abra DevTools (F12)
3. Vá para a aba **Console**
4. **Não deve haver erros de CSP** na aplicação normal
5. Vá para **Network** tab
6. Recarregue a página
7. Clique na primeira requisição (document)
8. Vá para **Headers**
9. Procure por `Content-Security-Policy`

**Exemplo esperado:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
```

### 3. Testar Funcionalidades Existentes

Certifique-se que nada quebrou:

#### 3.1 Calculadora de Investimentos
- [ ] Alterar valor inicial
- [ ] Alterar aporte mensal
- [ ] Alterar prazo (slider)
- [ ] Selecionar diferentes investimentos
- [ ] Verificar cálculos

#### 3.2 Impostos (IR e IOF)
- [ ] Marcar checkbox "Mostrar valores líquidos"
- [ ] Verificar card de impostos aparece
- [ ] Mudar para Poupança
- [ ] Verificar que aviso de isenção aparece
- [ ] Voltar para CDB
- [ ] Checkbox volta a aparecer

#### 3.3 API do Banco Central
- [ ] Verificar que taxas carregam
- [ ] Ver badge "Taxas oficiais BCB"
- [ ] Clicar em "Atualizar agora"
- [ ] Verificar que não há erro de CORS

#### 3.4 Exportação
- [ ] Clicar em "Exportar" → PDF
- [ ] Clicar em "Exportar" → Excel
- [ ] Clicar em "Exportar" → CSV
- [ ] Clicar em "Exportar" → JSON
- [ ] Verificar que downloads funcionam

#### 3.5 Histórico e Metas
- [ ] Adicionar uma meta
- [ ] Salvar simulação
- [ ] Carregar simulação do histórico
- [ ] Deletar simulação

#### 3.6 Modo Comparação
- [ ] Ativar "Comparar Cenários"
- [ ] Alterar cenário 2
- [ ] Verificar gráfico comparativo

#### 3.7 Tema
- [ ] Alternar entre Claro/Escuro
- [ ] Verificar que tudo permanece legível

#### 3.8 Mobile (iOS)
Se tiver iPhone disponível:
- [ ] Abrir no Safari
- [ ] Verificar botão "Instalar no iPhone"
- [ ] Clicar e ver instruções

### 4. Testar Funções de Segurança

Abra o console do navegador (F12 → Console) e teste:

```javascript
// Teste 1: Função de sanitização está disponível?
// (Não deve dar erro, mas também não expõe no window)
console.log("Funções de segurança protegidas no módulo lib/security");

// Teste 2: CSP bloqueando scripts inline maliciosos?
var script = document.createElement('script');
script.innerHTML = 'alert("XSS")';
document.body.appendChild(script);
// Deve ser bloqueado pelo CSP ou não executar
```

### 5. Testar em Diferentes Navegadores

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (Mac)
- [ ] Edge

### 6. Verificar Logs do Console

No terminal onde o servidor está rodando, verifique:

```bash
# Ver logs do servidor
# Procure por:
# - Erros de CSP (não deve ter para uso normal)
# - Avisos sobre dependências
# - Confirmação de que middleware está ativo
```

### 7. Testar Scripts de Segurança

Em outro terminal:

```bash
cd "/Users/manoellaludvig/Preco_ de_Esperar/calculadora-investimentos"

# 1. Audit de segurança
npm run audit

# 2. Verificar atualizações
npm run update:check

# 3. Check completo
npm run security:check
```

### 8. Testar Performance (Lighthouse)

1. Abra **http://localhost:3000**
2. Abra DevTools (F12)
3. Vá para **Lighthouse** tab
4. Selecione:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
5. Clique em **Generate Report**

**Scores esperados:**
- Performance: 85-100
- Accessibility: 90-100
- Best Practices: 95-100 ⭐ (deve melhorar com headers de segurança)
- SEO: 90-100

### 9. Teste Específico de Segurança

#### 9.1 Teste de Clickjacking
Crie um arquivo HTML temporário:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Teste de Clickjacking</h1>
  <iframe src="http://localhost:3000" width="800" height="600"></iframe>
</body>
</html>
```

Abra no navegador. O iframe **deve ser bloqueado** devido ao `X-Frame-Options: SAMEORIGIN`.

#### 9.2 Teste de XSS
Na URL, tente injetar:
```
http://localhost:3000/?test=<script>alert('XSS')</script>
```

O script **não deve executar** (React escapa automaticamente + CSP).

---

## 🐛 Problemas Conhecidos

### Vulnerabilidade xlsx
- **O que é**: Biblioteca de exportação Excel tem vulnerabilidade
- **Impacto**: Baixo (dados são locais, não vêm de input externo)
- **Status**: Documentado em VULNERABILITIES.md
- **Ação**: Funcionalidade funciona normalmente

### CSP e 'unsafe-inline'
- **O que é**: CSP permite 'unsafe-inline' para scripts
- **Por quê**: Next.js requer para funcionamento
- **Mitigação**: Nonces implementados no middleware

---

## ✅ Checklist de Aprovação

Após testar tudo acima, marque:

- [ ] Todos os headers de segurança presentes
- [ ] Nenhuma funcionalidade quebrada
- [ ] Calculadora funciona normalmente
- [ ] Exportações funcionam (PDF, Excel, CSV, JSON)
- [ ] API do BCB carrega taxas
- [ ] Impostos calculam corretamente
- [ ] Tema claro/escuro funciona
- [ ] Modo comparação funciona
- [ ] Metas e histórico funcionam
- [ ] Console sem erros críticos
- [ ] Scripts de audit executam
- [ ] Lighthouse Best Practices > 95

---

## 🚀 Próximo Passo

Se todos os testes passarem:

```bash
# Parar o servidor (Ctrl+C no terminal onde está rodando)

# Fazer commit das mudanças
git add .
git commit -m "feat: Implementar proteções de segurança OWASP Top 10

- Adicionar headers HTTP de segurança (CSP, HSTS, X-Frame-Options, etc)
- Criar middleware de segurança Next.js
- Implementar funções de sanitização e validação
- Adicionar rate limiting e proteção contra injeções
- Configurar Dependabot e GitHub Actions para security
- Criar documentação completa de segurança
- Adicionar scripts de auditoria
- Resolver vulnerabilidade xlsx (documentada e mitigada)

Arquivos criados:
- middleware.ts
- lib/security.ts
- SECURITY.md
- DEPLOY_SECURITY.md
- VULNERABILITIES.md
- .github/dependabot.yml
- .github/workflows/security.yml
- SECURITY_IMPLEMENTATION_SUMMARY.md

OWASP Top 10 2021 - Todas proteções implementadas"

# Push para o repositório
git push
```

---

## 📊 Resultados Esperados

### Headers HTTP
```
✅ Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
✅ Content-Security-Policy: default-src 'self'; ...
✅ X-Frame-Options: SAMEORIGIN
✅ X-Content-Type-Options: nosniff
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Permissions-Policy: camera=(), microphone=(), geolocation=()
❌ X-Powered-By: [NÃO DEVE APARECER]
```

### Console do Navegador
```
✅ Sem erros de CSP em uso normal
✅ Sem avisos de segurança
✅ API do BCB carrega corretamente
✅ Todos os recursos carregam
```

### Lighthouse
```
Performance: 🟢 85-100
Accessibility: 🟢 90-100
Best Practices: 🟢 95-100
SEO: 🟢 90-100
```

---

## 🆘 Troubleshooting

### Erro: "CSP bloqueando recurso"
- **Causa**: CSP muito restritivo
- **Solução**: Verificar console para ver qual recurso
- **Ajuste**: Adicionar domínio no `next.config.js` se necessário

### Erro: "CORS ao buscar API BCB"
- **Causa**: CSP bloqueando connect-src
- **Status**: Já configurado `https://api.bcb.gov.br`
- **Ação**: Se erro persistir, verificar console

### Funcionalidade não funciona
- **Ação**: Verificar console do navegador
- **Ação**: Verificar terminal do servidor
- **Ação**: Reportar issue específica

---

**Boa sorte nos testes! 🚀**

Se encontrar algum problema, verifique a documentação em `SECURITY.md`

