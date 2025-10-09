# 🚀 Guia de Deploy Seguro

## Checklist Pré-Deploy

Antes de fazer deploy para produção, verifique:

### 1. Variáveis de Ambiente

- [ ] Copiar `.env.example` para `.env.local`
- [ ] Gerar secrets seguros (mínimo 32 caracteres):
  ```bash
  # Linux/Mac
  openssl rand -base64 32
  
  # Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- [ ] Configurar `NODE_ENV=production`
- [ ] Verificar que `.env*` está no `.gitignore`
- [ ] **Nunca** commitar arquivos `.env`

### 2. Dependências

```bash
# 1. Verificar vulnerabilidades
npm audit

# 2. Corrigir vulnerabilidades automáticas
npm audit fix

# 3. Verificar atualizações
npm outdated

# 4. Atualizar dependências críticas
npm update

# 5. Check de tipos TypeScript
npm run type-check
```

### 3. Headers de Segurança

Verificar configuração no `next.config.js`:

- [ ] `Strict-Transport-Security` configurado
- [ ] `Content-Security-Policy` restritivo
- [ ] `X-Frame-Options` ativo
- [ ] `X-Content-Type-Options` ativo
- [ ] `poweredByHeader: false`

### 4. Testes de Segurança

```bash
# 1. Build de produção
npm run build

# 2. Testar localmente
npm start

# 3. Verificar headers
curl -I https://localhost:3000

# 4. Testar em https://securityheaders.com/
# 5. Testar em https://observatory.mozilla.org/
```

## Configuração Vercel

### 1. Variáveis de Ambiente

No painel da Vercel:
1. Settings → Environment Variables
2. Adicionar todas as variáveis do `.env.example`
3. Usar valores diferentes para cada ambiente (Development/Preview/Production)

### 2. Deploy Settings

- [ ] Node.js Version: 20.x ou superior
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`

### 3. Security Headers

Já configurados automaticamente via `next.config.js`

### 4. Domains e SSL

- [ ] Configurar domínio custom
- [ ] Habilitar HTTPS automático (Vercel faz isso por padrão)
- [ ] Verificar certificado SSL

## Monitoramento Pós-Deploy

### 1. Verificações Imediatas

```bash
# Testar headers de segurança
curl -I https://seu-dominio.com | grep -i "security\|frame\|xss\|content"

# Verificar CSP
curl -I https://seu-dominio.com | grep -i "content-security"

# Verificar HSTS
curl -I https://seu-dominio.com | grep -i "strict-transport"
```

### 2. Ferramentas Online

- **Security Headers**: https://securityheaders.com/
- **Mozilla Observatory**: https://observatory.mozilla.org/
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **OWASP ZAP**: Para scanning de vulnerabilidades

### 3. Logs e Alertas

Configure alertas para:
- Erros 500+ frequentes
- Picos anormais de tráfego
- Tentativas de acesso suspeitas
- Falhas de build

## Manutenção de Segurança

### Semanal

```bash
# Verificar vulnerabilidades
npm audit

# Verificar atualizações
npm outdated
```

### Mensal

```bash
# Atualizar dependências
npm update

# Rebuild e retest
npm run build
npm start

# Re-escanear com ferramentas de segurança
```

### Trimestral

- [ ] Revisar logs de acesso
- [ ] Atualizar documentação de segurança
- [ ] Revisar e atualizar secrets
- [ ] Audit completo de código
- [ ] Penetration testing (se aplicável)

## Resposta a Incidentes

### Se detectar uma vulnerabilidade:

1. **Isolar**: Desabilitar funcionalidade afetada se crítico
2. **Avaliar**: Determinar impacto e escopo
3. **Corrigir**: Aplicar patch de segurança
4. **Deploy**: Deploy urgente da correção
5. **Verificar**: Confirmar que vulnerabilidade foi corrigida
6. **Documentar**: Registrar incidente e correção
7. **Comunicar**: Notificar usuários se necessário

### Contatos de Emergência

- Equipe de DevOps: [email]
- Security Lead: [email]
- Vercel Support: https://vercel.com/support

## Recursos Úteis

### Documentação

- [OWASP Top 10](https://owasp.org/Top10/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Vercel Security](https://vercel.com/docs/concepts/security)

### Ferramentas

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Dependabot](https://github.com/dependabot)
- [OWASP ZAP](https://www.zaproxy.org/)

### Checklists

- [OWASP Security Checklist](https://github.com/0xRadi/OWASP-Web-Checklist)
- [Security.txt](https://securitytxt.org/)

## Compliance

### LGPD / GDPR

Se coletar dados pessoais:
- [ ] Política de privacidade implementada
- [ ] Consentimento explícito
- [ ] Direito ao esquecimento
- [ ] Criptografia de dados sensíveis
- [ ] DPO designado

### PCI DSS

Se processar pagamentos:
- [ ] Nunca armazenar dados de cartão
- [ ] Usar gateway de pagamento certificado
- [ ] Logs de auditoria
- [ ] Testes de penetração anuais

---

**Lembre-se**: Segurança é um processo contínuo, não um estado final.

**Última Atualização**: 2025-10-09

