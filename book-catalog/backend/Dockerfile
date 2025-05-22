# Imagem base do Node.js
FROM node:24-alpine

# Diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia o package.json e package-lock.json (se existir)
COPY package*.json ./

# Instala as dependências de produção
RUN npm install --omit=dev

# Copia o restante dos arquivos da aplicação
COPY . .

# Expõe a porta que a aplicação vai rodar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD [ "npm", "start" ]