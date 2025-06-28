# LoanTrack

A CLI-based loan tracking toolkit for Termux, built with TypeScript.

## Features
- Add new loans with lender details, amount, repayment date, and optional interest.
- View all loans with sorting and filtering options.
- Manage loans (edit, delete, mark as paid).
- Export loan data to a text file.
- Persistent storage using JSON.
- Due date reminders and total debt calculation.

## Installation
1. Install Node.js: `pkg install nodejs` (in Termux).
2. Install TypeScript: `npm install -g typescript`.
3. Clone this repository: `git clone <repo-url>`.
4. Navigate to the project directory: `cd loan-track`.
5. Install dependencies: `npm install`.
6. Run the app: `npm start`.

## Usage
- Run `npm start` to launch the interactive CLI.
- Follow the menu prompts to manage loans.
- Loan data is stored in `data/loans.json`.

## Requirements
- Node.js
- TypeScript
- Termux (for Android usage)

## License
MIT
