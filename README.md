# ScoreDesk - Football & Futsal Management System

## Overview

ScoreDesk is a comprehensive, real-time football and futsal management application designed for sports organizations, referees, and broadcasters. Built with modern web technologies and focused on multi-tenant, multi-user collaboration during live matches.

## Key Features

### 🏟️ **Multi-Format Support**
- **Football**: Standard 11v11 format with 90-minute matches
- **Futsal**: Indoor 5v5 format with 40-minute matches
- Configurable rules and duration per format

### 🏆 **Tournament Management**
- **Standalone Matches**: Single match management
- **League Format**: Round-robin tournaments with standings
- **Group Stage**: Multiple groups with advancement rules
- **Knockout Format**: Single/double elimination brackets

### ⚽ **Real-Time Match Control**
- Live match clock synchronization
- Multi-user collaboration (referee, stats operator, observers)
- Real-time event recording (goals, cards, substitutions)
- Professional scoreboard display
- Live statistics tracking

### 📊 **Advanced Statistics**
- Ball possession tracking
- Shots on/off target
- Pass accuracy and distance covered
- Cards, fouls, corners, and saves
- Performance analytics and trends

### 👥 **Multi-Tenant Architecture**
- Organization-based data isolation
- Role-based access control
- Team and player management
- User invitation and permissions

### 🎨 **Modern UI/UX**
- Dark/light theme support
- Responsive design for all devices
- Real-time updates across all connected users
- Accessibility compliant (WCAG 2.1)

## Technology Stack

### Frontend
- **Next.js 14+** with App Router and TypeScript
- **React 18+** with modern hooks and Suspense
- **Tailwind CSS** for styling
- **shadcn/ui** component library with theme support

### Backend
- **Supabase** complete backend-as-a-service
  - PostgreSQL database with real-time subscriptions
  - Authentication and authorization
  - Row Level Security (RLS)
  - Storage for file uploads

### Development Tools
- **TypeScript** for type safety
- **ESLint & Prettier** for code quality
- **Playwright** for E2E testing
- **npm** for package management

## Project Structure

```
scoredesk/
├── docs/                     # Complete specification documents
│   ├── 01-product-requirements.md
│   ├── 02-technical-architecture.md
│   ├── 03-database-schema.md
│   ├── 04-api-specification.md
│   ├── 05-component-architecture.md
│   ├── 06-user-experience-flow.md
│   └── 07-implementation-plan.md
├── app/                      # Next.js app directory
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components
│   ├── layout/               # Layout components
│   ├── forms/                # Form components
│   ├── match/                # Match-specific components
│   ├── tournament/           # Tournament components
│   ├── team/                 # Team management
│   ├── shared/               # Shared utilities
│   └── providers/            # Context providers
├── lib/                      # Utility functions
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript type definitions
└── supabase/                 # Database migrations and functions
```

## Documentation

### 📋 Core Specifications
1. **[Product Requirements Document](docs/01-product-requirements.md)** - Complete feature requirements and user personas
2. **[Technical Architecture](docs/02-technical-architecture.md)** - System architecture and technology decisions
3. **[Database Schema](docs/03-database-schema.md)** - Complete database design with RLS policies
4. **[API Specification](docs/04-api-specification.md)** - REST API and real-time subscriptions
5. **[Component Architecture](docs/05-component-architecture.md)** - UI component design and patterns
6. **[User Experience Flow](docs/06-user-experience-flow.md)** - User journeys and interface design
7. **[Implementation Plan](docs/07-implementation-plan.md)** - 20-week development roadmap

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd scoredesk

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Set up Supabase locally (optional)
npx supabase init
npx supabase start

# Run the development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Development Phases

### Phase 1: Foundation (Weeks 1-4)
- ✅ Project setup and authentication
- ✅ Database schema and UI foundation
- ✅ Organization management
- ✅ Team and player management

### Phase 2: Tournament & Matches (Weeks 5-8)
- 🔄 Tournament creation and configuration
- 🔄 Match management and scheduling
- 🔄 Basic scoreboard implementation
- 🔄 UI polish and responsive design

### Phase 3: Real-time Features (Weeks 9-12)
- ⏳ Real-time infrastructure
- ⏳ Match event system
- ⏳ Match timer control
- ⏳ Multi-user collaboration

### Phase 4: Statistics (Weeks 13-16)
- ⏳ Live statistics tracking
- ⏳ Statistics dashboard
- ⏳ Match reports and export
- ⏳ Performance optimization

### Phase 5: Advanced Features (Weeks 17-20)
- ⏳ Tournament brackets and standings
- ⏳ Mobile optimization
- ⏳ Testing and QA
- ⏳ Production deployment

## Key Features by User Role

### 🔧 **Tournament Administrator**
- Create and manage tournaments
- Team registration approval
- Match scheduling and venue management
- Results oversight and standings

### 👨‍⚖️ **Referee**
- Official match time control
- Event recording (goals, cards, fouls)
- Match status management
- Post-match reporting

### 📊 **Statistics Operator**
- Live statistics tracking
- Performance metrics recording
- Data validation and correction
- Real-time collaboration with referee

### 👔 **Team Manager**
- Team and player management
- Match lineup submission
- Performance analytics
- Tournament registration

### 📺 **Broadcaster/Media**
- Live match data access
- Statistics and performance data
- Exportable match summaries
- Real-time APIs for integration

## Contributing

This project follows Spec-Driven Development (SDD) principles. Before implementing any features:

1. Review the relevant specification documents
2. Follow the component architecture patterns
3. Ensure TypeScript compliance
4. Add appropriate tests
5. Update documentation as needed

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier compliance
- 80%+ test coverage
- Accessibility compliance (WCAG 2.1)

## Architecture Highlights

### 🔄 **Real-time Collaboration**
- Supabase real-time subscriptions for live updates
- Multi-user match control with conflict resolution
- Live scoreboard synchronization
- Real-time statistics tracking

### 🔒 **Security & Multi-tenancy**
- Row Level Security (RLS) for data isolation
- JWT-based authentication with Supabase Auth
- Role-based access control
- Organization-based data segregation

### 📱 **Responsive Design**
- Mobile-first approach
- Progressive Web App features
- Touch-friendly interfaces
- Offline capabilities

### ⚡ **Performance**
- Code splitting and lazy loading
- Optimistic updates for better UX
- Virtual scrolling for large datasets
- Real-time connection optimization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or contributions, please refer to the comprehensive documentation in the `docs/` directory or open an issue in the repository.

---

**ScoreDesk** - Bringing professional sports management to every level of football and futsal competition.
