FROM node:24-bookworm

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV HEADLESS=true
ENV CUCUMBER_WORKERS=2

# Install locked dependencies, including test tools.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Install browsers and their Linux system dependencies.
RUN npx playwright install --with-deps chromium firefox webkit

# Copy source without local secrets or generated files.
COPY . .

# Allow the non-root user to compile tests and write reports.
RUN mkdir -p reports && chown -R node:node /app

USER node

# Default entry point: compile and execute Cucumber.
CMD ["npm", "test"]