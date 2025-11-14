# Docker Deployment Guide

This guide covers how to build and run Krypta using Docker.

## 🐳 Quick Start

### Using Docker Hub (Recommended)

```bash
# Pull the latest image
docker pull YOUR_DOCKERHUB_USERNAME/krypta:latest

# Run the container
docker run -d -p 8080:80 --name krypta YOUR_DOCKERHUB_USERNAME/krypta:latest
```

Access Krypta at `http://localhost:8080`

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/krypta.git
cd krypta

# Start with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔨 Building Locally

### Build the Docker Image

```bash
# Build the image
docker build -t krypta:latest .

# Or with a specific tag
docker build -t krypta:1.0.0 .
```

### Run the Container

```bash
# Run on port 8080
docker run -d -p 8080:80 --name krypta krypta:latest

# Run on port 80 (requires sudo/root)
docker run -d -p 80:80 --name krypta krypta:latest

# Run with custom port
docker run -d -p 3000:80 --name krypta krypta:latest
```

## 📋 Container Management

### Basic Commands

```bash
# Start the container
docker start krypta

# Stop the container
docker stop krypta

# Restart the container
docker restart krypta

# View logs
docker logs krypta
docker logs -f krypta  # Follow logs

# Remove the container
docker rm krypta

# Remove the image
docker rmi krypta:latest
```

### Health Check

```bash
# Check container health
docker inspect krypta | grep -A 10 Health

# Test health endpoint
curl http://localhost:8080/health
```

## 🚀 Pushing to Docker Hub

### Prerequisites

1. Create a Docker Hub account at https://hub.docker.com
2. Create a repository named `krypta`

### Login and Push

```bash
# Login to Docker Hub
docker login

# Tag your image
docker tag krypta:latest YOUR_DOCKERHUB_USERNAME/krypta:latest
docker tag krypta:latest YOUR_DOCKERHUB_USERNAME/krypta:1.0.0

# Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/krypta:latest
docker push YOUR_DOCKERHUB_USERNAME/krypta:1.0.0
```

### Automated Builds with GitHub Actions

See `.github/workflows/docker-publish.yml` for automated builds on push/release.

## 🔧 Configuration

### Environment Variables

Currently, Krypta doesn't require environment variables. All configuration is done through the UI.

### Custom nginx Configuration

To use a custom nginx configuration:

```bash
# Create custom nginx.conf
docker run -d \
  -p 8080:80 \
  -v $(pwd)/custom-nginx.conf:/etc/nginx/conf.d/default.conf \
  --name krypta \
  YOUR_DOCKERHUB_USERNAME/krypta:latest
```

### Volumes (Optional)

If you want to persist any data:

```bash
docker run -d \
  -p 8080:80 \
  -v krypta-data:/data \
  --name krypta \
  YOUR_DOCKERHUB_USERNAME/krypta:latest
```

## 🌐 Production Deployment

### Using HTTPS with Reverse Proxy

It's recommended to run Krypta behind a reverse proxy (nginx, Caddy, Traefik) for HTTPS.

#### Example with Caddy

```caddy
krypta.yourdomain.com {
    reverse_proxy localhost:8080
    
    # Required headers for SharedArrayBuffer
    header {
        Cross-Origin-Embedder-Policy "require-corp"
        Cross-Origin-Opener-Policy "same-origin"
    }
}
```

#### Example with nginx

```nginx
server {
    listen 443 ssl http2;
    server_name krypta.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Required headers
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
    }
}
```

### Docker Compose with Traefik

```yaml
version: '3.8'

services:
  krypta:
    image: YOUR_DOCKERHUB_USERNAME/krypta:latest
    container_name: krypta
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.krypta.rule=Host(`krypta.yourdomain.com`)"
      - "traefik.http.routers.krypta.entrypoints=websecure"
      - "traefik.http.routers.krypta.tls.certresolver=letsencrypt"
      - "traefik.http.middlewares.krypta-headers.headers.customresponseheaders.Cross-Origin-Embedder-Policy=require-corp"
      - "traefik.http.middlewares.krypta-headers.headers.customresponseheaders.Cross-Origin-Opener-Policy=same-origin"
      - "traefik.http.routers.krypta.middlewares=krypta-headers"
```

## 🔍 Troubleshooting

### Container won't start

```bash
# Check logs
docker logs krypta

# Check if port is already in use
sudo netstat -tlnp | grep :8080
```

### Build fails

```bash
# Clean build with no cache
docker build --no-cache -t krypta:latest .

# Check Docker disk space
docker system df
docker system prune
```

### Can't access the application

```bash
# Check if container is running
docker ps

# Check port mapping
docker port krypta

# Test from inside container
docker exec -it krypta wget -O- http://localhost/health
```

### SharedArrayBuffer errors

Make sure the `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers are set correctly. These are required for the Olm encryption library.

Check headers:
```bash
curl -I http://localhost:8080
```

## 📊 Resource Usage

- **Image Size**: ~50-60MB (compressed)
- **Memory Usage**: ~10-20MB idle
- **CPU Usage**: Minimal when idle

## 🔐 Security Notes

1. **HTTPS Required**: For production, always use HTTPS (reverse proxy)
2. **Desktop Notifications**: Only work over HTTPS or localhost
3. **Regular Updates**: Keep the image updated with security patches
4. **No Secrets in Image**: The image contains no credentials or secrets

## 📝 Multi-Architecture Builds

To build for multiple architectures (amd64, arm64):

```bash
# Enable buildx
docker buildx create --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t YOUR_DOCKERHUB_USERNAME/krypta:latest \
  --push .
```

## 🎯 Best Practices

1. **Use specific tags**: Instead of `:latest`, use version tags like `:1.0.0`
2. **Health checks**: Always enabled in the Dockerfile
3. **Resource limits**: Set CPU/memory limits in production
4. **Restart policy**: Use `unless-stopped` or `always`
5. **Logging**: Configure Docker logging driver for production
6. **Updates**: Regularly rebuild and push new versions

## 📦 Alternative Deployment Options

- **Kubernetes**: Create Deployment and Service manifests
- **Podman**: Compatible with Podman (rootless containers)
- **Cloud Run**: Deploy to Google Cloud Run
- **AWS ECS**: Deploy to Amazon ECS
- **Azure Container Instances**: Deploy to Azure

## 🆘 Support

- **Issues**: https://github.com/YOUR_USERNAME/krypta/issues
- **Discussions**: https://github.com/YOUR_USERNAME/krypta/discussions
- **Docker Hub**: https://hub.docker.com/r/YOUR_DOCKERHUB_USERNAME/krypta

---

Built with ❤️ for the Matrix community

