# Imagem base do Nginx
FROM nginx:1.28-alpine 

# Apenas copia os arquivos do frontend para o diretório padrão do Nginx.
# A configuração padrão do Nginx já serve arquivos deste diretório na porta 80.
COPY . /usr/share/nginx/html

EXPOSE 80
# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
