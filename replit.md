# Subscription Manager Application

## Overview

A modern subscription management web application built with React and Express that helps users track their recurring subscriptions. The application features a clean dashboard interface for viewing, adding, editing, and managing subscription services with comprehensive filtering and metrics tracking capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, accessible UI components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod for validation and type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript for full-stack type safety
- **Data Storage**: In-memory storage with interface abstraction for easy database migration
- **Schema Validation**: Zod schemas shared between frontend and backend for consistent validation
- **API Design**: RESTful endpoints for CRUD operations on subscription entities

### Database Schema
- **Subscriptions Table**: Core entity with fields for name, category, cost, billing cycle, renewal date, status, logo URL, description, and last used date
- **Data Types**: Uses Drizzle ORM schema definitions with PostgreSQL as the target database
- **Validation**: Zod schemas ensure data integrity and provide client-side validation

### Authentication and Authorization
- Currently uses a simple session-based approach
- No complex authentication system implemented, designed for single-user scenarios

### Component Architecture
- **Modular Design**: Reusable UI components following atomic design principles
- **Feature Components**: Specialized components for subscription management (cards, dialogs, filters)
- **Shared Components**: Common UI elements from shadcn/ui library
- **Form Components**: Dedicated components for add/edit subscription workflows

### Data Flow
- **Client-Server Communication**: Fetch API with custom wrapper for consistent error handling
- **Optimistic Updates**: TanStack Query handles cache invalidation and background refetching
- **Real-time UI**: Toast notifications for user feedback on actions
- **State Synchronization**: Query client manages server state synchronization

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form for modern React development
- **TypeScript**: Full TypeScript support across frontend and backend
- **Vite**: Development server and build tool with React plugin support

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Radix UI**: Headless UI components for accessibility and behavior
- **shadcn/ui**: Pre-built component library based on Radix UI primitives
- **Lucide React**: Icon library for consistent iconography

### Backend Dependencies
- **Express.js**: Web framework for Node.js API development
- **Drizzle ORM**: Type-safe ORM for database operations
- **Neon Database**: Serverless PostgreSQL for production database hosting

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **TSX**: TypeScript execution engine for development
- **PostCSS**: CSS processing with Tailwind CSS integration

### Validation and Types
- **Zod**: Schema validation library shared between frontend and backend
- **Drizzle-Zod**: Integration between Drizzle ORM and Zod for type-safe schemas

### State Management
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight routing solution for single-page application navigation

### Utility Libraries
- **date-fns**: Date manipulation and formatting utilities
- **clsx**: Conditional CSS class utilities
- **class-variance-authority**: Utility for creating variant-based component APIs