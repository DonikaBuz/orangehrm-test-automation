FROM node:24-bookworm

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV HEADLESS=true
ENV CUCUMBER_WORKERS=1

COPY package.json package-lock.json ./
RUN npm ci --include=dev

RUN npx playwright install --with-deps chromium firefox webkit

COPY . .

RUN mkdir -p reports && chown -R node:node /app

USER node

CMD ["npm", "test"]