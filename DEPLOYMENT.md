# ScoreDesk Deployment Guide

## Vercel Deployment

### Prerequisites
1. Vercel account
2. GitHub repository
3. Supabase project

### Setup Instructions

#### 1. Connect GitHub Repository
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click "New Project"
- Import your ScoreDesk repository

#### 2. Configure Environment Variables
Add the following environment variables in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://nhhrgkeelzjnasiesdhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 3. Deploy
- Vercel will automatically deploy on every push to main branch
- Preview deployments are created for pull requests

### GitHub Actions Setup

#### Required Secrets
Add these secrets to your GitHub repository:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
NEXT_PUBLIC_SUPABASE_URL=https://nhhrgkeelzjnasiesdhf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Workflow Files
- `.github/workflows/ci.yml` - Continuous Integration
- `.github/workflows/deploy-preview.yml` - Preview deployments
- `.github/workflows/deploy-production.yml` - Production deployments

### Build Configuration
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Development Command: `npm run dev`

### Performance Optimization
- Automatic image optimization
- Automatic code splitting
- Edge caching
- Serverless functions for API routes

### Monitoring
- Vercel Analytics
- Core Web Vitals tracking
- Error monitoring
- Performance insights
