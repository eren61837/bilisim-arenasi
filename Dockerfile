FROM node:22-alpine

WORKDIR /app

# 1. Bagimliliklari kopyala ve kur
COPY package*.json ./
RUN npm install --production

# 2. Kodlari kopyala
COPY . .

# 3. Hugging Face Spaces 7860 portunu dinler
ENV PORT=7860
EXPOSE 7860

# 4. Sunucuyu baslat
CMD ["node", "server.js"]
