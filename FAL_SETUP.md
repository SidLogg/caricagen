# Como Configurar o Fal.ai (GRATUITO)

## Passo 1: Criar Conta no Fal.ai

1. Acesse: https://fal.ai/
2. Clique em "Sign Up" (pode usar Google/GitHub)
3. Confirme seu email

## Passo 2: Obter API Key GRATUITA

1. Acesse: https://fal.ai/dashboard/keys
2. Clique em "Create new key"
3. Copie a chave gerada (começa com algo como `fal_...`)

## Passo 3: Configurar no Projeto

1. Abra o arquivo `.env.local` na raiz do projeto
2. Adicione a linha:
   ```
   FAL_KEY=sua_chave_aqui
   ```
3. Salve o arquivo

## Passo 4: Reiniciar o Servidor

1. Pare o servidor (Ctrl+C no terminal)
2. Execute novamente: `npm run dev`
3. Acesse http://localhost:3000

## Tier Gratuito do Fal.ai

- ✅ ~100-200 gerações por dia
- ✅ Modelo FLUX (excelente qualidade)
- ✅ Preserva traços fisionômicos
- ✅ Rápido (2-5 segundos por imagem)
- ✅ Sem cartão de crédito necessário

## Importante

- Os créditos gratuitos expiram em 90 dias
- Depois você pode criar nova conta ou pagar (~$0.003/imagem)
- É a melhor opção gratuita disponível atualmente

## Suporte

Se tiver problemas:
1. Verifique se a chave está correta no `.env.local`
2. Reinicie o servidor
3. Veja os logs no terminal para erros
