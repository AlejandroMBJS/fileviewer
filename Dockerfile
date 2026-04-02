FROM node:20-bookworm-slim

WORKDIR /app

ARG ODA_DEB_URL="https://www.opendesign.com/guestfiles/get?filename=ODAFileConverter_QT6_lnxX64_8.3dll_27.1.deb"

ENV NODE_ENV=production
ENV DWG_CONVERTER_CMD="bash /app/scripts/convert-dwg.sh {input} {output}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gdebi-core \
    xauth \
    xvfb \
    libasound2 \
    libegl1 \
    libfontconfig1 \
    libgl1 \
    libglib2.0-0 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb-cursor0 \
    libxcb-glx0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libxcb-shm0 \
    libxcb-sync1 \
    libxcb-xfixes0 \
    libxcb-xinerama0 \
    libxcb-xinput0 \
    libxcb1 \
    libxext6 \
    libxkbcommon-x11-0 \
    libxrender1 \
  && curl -fL "$ODA_DEB_URL" -o /tmp/odafileconverter.deb \
  && gdebi -n /tmp/odafileconverter.deb \
  && rm -f /tmp/odafileconverter.deb \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

RUN chmod +x /app/scripts/convert-dwg.sh \
  && npm run build

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
