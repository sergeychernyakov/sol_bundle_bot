# Solana Bundle Bot

## Overview

This bot is designed to manage multiple Solana wallets, allowing users to perform various operations like creating wallets, buying and selling tokens, topping up wallets, and closing wallets. It provides an interactive CLI interface for easy management of Solana wallets and transactions.

## Features

1. **Create or Use Existing Wallets**: 
   - Manage wallets by creating new ones or using existing private keys from the `.env` file.
   
2. **Top Up Wallets**:
   - Add funds to existing Solana wallets.

3. **Buy Tokens**:
   - Allows the user to buy tokens using Solana wallets (functionality yet to be implemented).

4. **Sell Tokens**:
   - Allows the user to sell tokens using Solana wallets (functionality yet to be implemented).

5. **Buy and Sell Tokens**:
   - Provides a combined operation of buying and selling tokens (functionality yet to be implemented).

6. **Close Wallets**:
   - Close and remove wallets (functionality yet to be implemented).

## Technology Stack

- **Node.js**: JavaScript runtime environment for executing server-side code.
- **TypeScript**: A statically typed superset of JavaScript used for improved code quality and maintainability.
- **Solana Web3.js**: Solana's official library for interacting with the Solana blockchain.
- **dotenv**: Used for managing environment variables.
- **readline-sync**: Provides synchronous user input via CLI.
- **ts-node**: TypeScript execution environment for Node.js, allowing TypeScript to be run directly without pre-compiling.

## Project Structure

- **src/**: Contains the source code files.
  - **bot.ts**: The main entry point of the bot containing the interactive CLI menu.
  - **services/**: Contains service files that manage different functionalities.
    - **wallet_manager.ts**: Handles wallet management functionalities like creating, using, and topping up wallets.

- **dist/**: Contains the compiled JavaScript files.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node package manager)
- Solana CLI installed and configured

### Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/sergeychernyakov/sol_bundle_bot.git
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Set up environment variables**:

   - Create/copy a `.env` file in the root directory.

    ```bash
    cp .env.example .env
    ```

   - Edit the following environment variables:

     ```env
     BUNDLE_WALLET_PRIVATE_KEYS="<your_private_keys>"
     ```

4. **Run the bot**:
    ```bash
    npm start
    ```

## Usage

The bot provides an interactive CLI menu with the following options:

1. **Create or Use Existing Wallets**: Manage wallets.
2. **Top Up Wallets**: Add funds to wallets.
3. **Buy Tokens**: Purchase tokens (not yet implemented).
4. **Sell Tokens**: Sell tokens (not yet implemented).
5. **Buy and Sell Tokens**: Combine buying and selling operations (not yet implemented).
6. **Close Wallets**: Close and remove wallets (not yet implemented).
7. **Exit**: Exit the bot.


## Author

Sergey Chernyakov  
Telegram: [@AIBotsTech](https://t.me/AIBotsTech)
