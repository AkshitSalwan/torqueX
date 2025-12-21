# 🚂 Railway Deployment Guide for TorqueX

## Quick Deploy (5 minutes)

### Step 1: Sign up for Railway
1. Go to https://railway.app
2. Click "Login" → Sign in with GitHub
3. Authorize Railway to access your GitHub account

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: **AkshitSalwan/torqueX**
4. Click "Deploy Now"

### Step 3: Add PostgreSQL Database
1. In your project dashboard, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create and link the database
4. It will auto-set the `DATABASE_URL` environment variable

### Step 4: Add Redis
1. Click "+ New" again
2. Select "Database" → "Add Redis"
3. Railway will auto-configure and set `REDIS_URL`

### Step 5: Configure Environment Variables
Click on your web service → "Variables" tab → Add these variables:

```env
# Required Variables
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Encryption Key (MUST be 64 hex characters - 32 bytes)
ENCRYPTION_KEY=7f6f9536770614df353188e6f136bb27484873290f71bdd683b69cc65588016c

# Optional - Clerk Authentication (if using)
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
SKIP_CLERK=true

# Optional - Stripe Payments (if using)
STRIPE_SECRET_KEY=your_stripe_secret_key

# The following are automatically set by Railway:
# DATABASE_URL (from PostgreSQL service)
# REDIS_URL (from Redis service)
```

### Step 6: Generate New Session Secret
Run this command locally to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it as your `SESSION_SECRET`.

### Step 7: Deploy
1. Railway will automatically deploy after you save the variables
2. Click "Deployments" to watch the build progress
3. Once deployed, click "Settings" → "Generate Domain" to get your public URL

### Step 8: Run Database Migrations
Railway automatically runs migrations via the start command in `railway.toml`:
```
npx prisma migrate deploy
```

### Step 9: Create Admin User
After first deployment, you need to create an admin account:

1. Go to your Railway project
2. Click on your web service
3. Click "Variables" tab
4. Add a temporary variable to run the setup:

```bash
# In Railway CLI or using a one-time deployment
railway run node scripts/create-admin.js
```

Or manually create via Prisma Studio:
1. Click on PostgreSQL service → "Data" tab
2. Find the `User` table
3. Create a new user with:
   - email: `admin@torquex.com`
   - role: `ADMIN`
   - name: `Admin`
   - clerkId: `manual-admin-123`
   - Set password hash using bcrypt

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Auto | PostgreSQL connection | Auto-set by Railway |
| `REDIS_URL` | ✅ Auto | Redis connection | Auto-set by Railway |
| `NODE_ENV` | ✅ | Environment | `production` |
| `PORT` | ✅ Auto | Server port | Auto-set by Railway |
| `SESSION_SECRET` | ✅ | Session encryption | Generate with crypto |
| `ENCRYPTION_KEY` | ✅ | Data encryption (32 bytes hex) | 64 hex characters |
| `SKIP_CLERK` | ⚠️ | Disable Clerk auth | `true` |
| `CLERK_PUBLISHABLE_KEY` | ⬜ | Clerk public key | Optional |
| `CLERK_SECRET_KEY` | ⬜ | Clerk secret | Optional |
| `STRIPE_SECRET_KEY` | ⬜ | Stripe payments | Optional |

---

## Post-Deployment Steps

### 1. Verify Deployment
```bash
# Test your deployed site
curl https://your-app.railway.app

# Check health
curl https://your-app.railway.app/
```

### 2. Create Test Users
SSH into Railway and run:
```bash
railway run node scripts/create-test-users.js
```

### 3. Monitor Logs
In Railway dashboard:
- Click "Deployments" → "View Logs"
- Monitor for errors or issues

---

## Troubleshooting

### Build Fails
- Check Railway logs for specific errors
- Ensure `package.json` has correct Node version
- Verify all dependencies are in `dependencies` not `devDependencies`

### Database Connection Error
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Run migrations: `railway run npx prisma migrate deploy`

### Redis Connection Error
- Verify `REDIS_URL` is set
- Check Redis service status
- Ensure Redis connection string format is correct

### Application Won't Start
- Check `railway.toml` start command
- Verify environment variables are set
- Check logs for missing dependencies

---

## Estimated Costs

**Railway Pricing:**
- Free Trial: $5 credit (enough for ~1 month of testing)
- After trial: ~$5-10/month for small app
  - Web Service: ~$2/month
  - PostgreSQL: ~$2/month
  - Redis: ~$1/month

**Total: ~$5/month** for production hosting with databases included.

---

## Custom Domain (Optional)

1. In Railway dashboard → "Settings"
2. Click "Custom Domain"
3. Add your domain (e.g., `torquex.com`)
4. Update DNS records as shown:
   - Add CNAME record pointing to Railway
5. Wait for DNS propagation (5-30 minutes)

---

## Railway CLI (Optional)

Install Railway CLI for easier management:

```bash
# Install
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Run commands
railway run node scripts/create-admin.js

# Open shell
railway shell
```

---

## Success Checklist

- [ ] Railway account created
- [ ] Project deployed from GitHub
- [ ] PostgreSQL added and connected
- [ ] Redis added and connected
- [ ] Environment variables configured
- [ ] Domain generated
- [ ] Database migrations run
- [ ] Admin user created
- [ ] Application accessible
- [ ] Test authentication
- [ ] Test admin panel

---

🎉 Your TorqueX application is now live on Railway!

Visit your app at: **https://your-app.railway.app**
