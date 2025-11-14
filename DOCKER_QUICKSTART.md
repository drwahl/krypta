# Docker Quick Start - Step by Step Guide

This guide walks you through building and pushing Krypta to Docker Hub.

## Prerequisites

1. ✅ Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
2. ✅ Docker Hub account ([Sign up](https://hub.docker.com/signup))
3. ✅ Your Docker Hub username (let's call it `YOUR_USERNAME`)

## Step 1: Update Placeholders

Before building, replace `YOUR_DOCKERHUB_USERNAME` and `YOUR_USERNAME` in these files:

- `DOCKER.md` - Multiple places
- `.github/workflows/docker-publish.yml` - Line 13 and image name
- `README.md` - Docker pull command

**Quick find and replace:**
```bash
# Replace YOUR_DOCKERHUB_USERNAME with your actual Docker Hub username
find . -type f \( -name "*.md" -o -name "*.yml" \) -exec sed -i 's/YOUR_DOCKERHUB_USERNAME/your-actual-username/g' {} +

# Replace YOUR_USERNAME with your actual GitHub username
find . -type f \( -name "*.md" -o -name "*.yml" \) -exec sed -i 's/YOUR_USERNAME/your-github-username/g' {} +
```

Or manually edit:
- Search for `YOUR_DOCKERHUB_USERNAME` and replace with your Docker Hub username
- Search for `YOUR_USERNAME` and replace with your GitHub username

## Step 2: Create Docker Hub Repository

1. Go to https://hub.docker.com
2. Click "Create Repository"
3. Name it: `krypta`
4. Set visibility: Public (or Private if preferred)
5. Click "Create"

## Step 3: Test Build Locally

```bash
# Make sure you're in the project directory
cd /path/to/krypta

# Build the Docker image
docker build -t krypta:latest .

# This will take a few minutes the first time
# You should see: Successfully tagged krypta:latest
```

## Step 4: Test Run Locally

```bash
# Run the container
docker run -d -p 8080:80 --name krypta-test krypta:latest

# Check if it's running
docker ps

# Test in browser: http://localhost:8080

# Check logs
docker logs krypta-test

# Stop and remove test container
docker stop krypta-test
docker rm krypta-test
```

## Step 5: Login to Docker Hub

```bash
# Login (you'll be prompted for username and password)
docker login

# Enter your Docker Hub username
# Enter your Docker Hub password or access token
```

**Tip**: For better security, use an access token instead of password:
1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Name it "krypta-deploy"
4. Copy the token
5. Use the token as your password when logging in

## Step 6: Tag and Push to Docker Hub

```bash
# Tag the image with your username
docker tag krypta:latest your-dockerhub-username/krypta:latest
docker tag krypta:latest your-dockerhub-username/krypta:1.0.0

# Push to Docker Hub
docker push your-dockerhub-username/krypta:latest
docker push your-dockerhub-username/krypta:1.0.0

# This will take a few minutes to upload
```

## Step 7: Test from Docker Hub

```bash
# Remove local images to test
docker rmi krypta:latest your-dockerhub-username/krypta:latest

# Pull from Docker Hub
docker pull your-dockerhub-username/krypta:latest

# Run it
docker run -d -p 8080:80 --name krypta your-dockerhub-username/krypta:latest

# Test: http://localhost:8080
```

## Step 8: Set Up GitHub Actions (Optional but Recommended)

This will automatically build and push to Docker Hub on every commit/release.

1. Go to your GitHub repository settings
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Create these secrets:
   - Name: `DOCKERHUB_USERNAME`
     Value: Your Docker Hub username
   - Name: `DOCKERHUB_TOKEN`
     Value: Your Docker Hub access token (from Step 5)

5. Commit and push the workflow file:
```bash
git add .github/workflows/docker-publish.yml
git commit -m "Add Docker Hub automated builds"
git push
```

Now every push to `main` will automatically:
- Build the Docker image
- Push to Docker Hub with `latest` tag
- Support multi-architecture (amd64 and arm64)

When you create a release tag like `v1.0.0`, it will also tag as `1.0.0`, `1.0`, and `1`.

## Step 9: Update Docker Hub Repository Description

1. Go to https://hub.docker.com/repository/docker/your-username/krypta
2. Click "Edit"
3. Add a short description: "A blazingly fast, modern Matrix chat client"
4. Copy your README.md content to the full description
5. Click "Update"

## Common Commands Reference

```bash
# Build
docker build -t krypta:latest .

# Run on port 8080
docker run -d -p 8080:80 --name krypta krypta:latest

# Run with docker-compose
docker-compose up -d

# View logs
docker logs -f krypta

# Stop
docker stop krypta

# Remove
docker rm krypta

# Clean up everything
docker stop krypta
docker rm krypta
docker rmi krypta:latest

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t your-username/krypta:latest --push .
```

## Troubleshooting

### Build fails with "npm ci" error
```bash
# Try cleaning npm cache
docker build --no-cache -t krypta:latest .
```

### "Port already in use"
```bash
# Check what's using port 8080
sudo lsof -i :8080

# Use a different port
docker run -d -p 3000:80 --name krypta krypta:latest
```

### "Access denied" when pushing
```bash
# Login again
docker logout
docker login

# Make sure image is tagged correctly
docker tag krypta:latest your-username/krypta:latest
```

### Image is too large
The final image should be ~50-60MB. If it's larger:
```bash
# Check image size
docker images krypta

# Make sure .dockerignore is working
cat .dockerignore
```

## Next Steps

1. ✅ Share your Docker Hub link: `https://hub.docker.com/r/your-username/krypta`
2. ✅ Update your GitHub README with the actual Docker Hub link
3. ✅ Create a GitHub release (v1.0.0) to trigger automated build
4. ✅ Test on different platforms
5. ✅ Deploy to production!

## Production Deployment Tips

- **Use a reverse proxy** (nginx, Caddy, Traefik) for HTTPS
- **Set resource limits**: `docker run --memory="512m" --cpus="0.5" ...`
- **Use health checks**: Already included in Dockerfile
- **Monitor logs**: Set up log aggregation
- **Automated updates**: Use Watchtower or similar

## Support

Need help?
- Docker Documentation: https://docs.docker.com
- GitHub Issues: https://github.com/YOUR_USERNAME/krypta/issues
- Matrix Room: Create one for your project!

---

🎉 Congratulations! Your Krypta instance is now containerized and ready to deploy anywhere!

