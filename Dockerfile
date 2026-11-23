FROM node:22-alpine

# Cài đặt OpenSSL và libc6-compat cho Prisma Query Engine trên Alpine Linux
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Sao chép package manifests và prisma schema trước để tận dụng Docker cache layer
COPY package.json yarn.lock* ./
COPY prisma ./prisma/

# Cài đặt toàn bộ dependencies
RUN yarn install

# Sao chép toàn bộ mã nguồn
COPY . .

# Generate Prisma Client & Build NestJS application
RUN yarn prisma:generate && yarn build

# Cấp quyền thực thi cho entrypoint script.
# sed bỏ \r: nếu máy Windows checkout file thành CRLF thì shebang hóa "#!/bin/sh\r",
# container sẽ báo "no such file or directory" dù file vẫn có thật.
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Cổng mặc định của ứng dụng
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
