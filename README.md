# Stellar Disbursement Platform Frontend

A modern React-based frontend application for managing Stellar network disbursements and payments.

## Features

- **Multi-asset Support**: Handle various Stellar assets including XLM, USDC, and custom tokens
- **Disbursement Management**: Create and manage bulk payment disbursements
- **Real-time Analytics**: Track payment status and transaction history
- **API Integration**: Comprehensive API management with key-based authentication
- **Responsive Design**: Modern UI built with Stellar Design System
- **TypeScript**: Full TypeScript support for better development experience

## Tech Stack

- React 18.3.1
- TypeScript 5.7.2
- Redux Toolkit 2.4.0
- React Query 5.62.3
- Stellar Design System 3.1.3
- Webpack 5.97.1
- Sass for styling

## Getting Started

### Prerequisites

- Node.js >= 20.x
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Stellar-Dis-Frontend.git

# Navigate to project directory
cd Stellar-Dis-Frontend

# Install dependencies
yarn install

# Start development server
yarn start
```

### Available Scripts

- `yarn start` - Start development server
- `yarn build` - Build for production
- `yarn production` - Build and serve production version with Docker
- `yarn pre-commit` - Run linting and type checking

## Project Structure

```
src/
├── api/           # API service functions
├── apiQueries/    # React Query hooks
├── components/    # Reusable UI components
├── constants/     # Application constants
├── helpers/       # Utility functions
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── store/         # Redux store configuration
└── types/         # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

Apache-2.0 License
