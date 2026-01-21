# Angular Dip Hunter 📉 🎯

**Angular Dip Hunter** is a personal stock portfolio management dashboard designed to track and optimize investments using a "Buy on Dip" strategy. It specifically manages a split-portfolio structure, monitoring specific allocations for "Growth" and "Dividend" assets.

## 🚀 Features

* **Portfolio Segmentation**: distinct visual tracking for **"Growth Twenty"** and **"Dividend Ten"** folders.
* **Buy-on-Dip Logic**: Automated indicators highlighting stocks that have hit target dip percentages.
* **Interactive Visualizations**: Rich data visualization for portfolio performance and historical dips using **Highcharts.js**.
* **Responsive Design**: A clean, modern UI built with **Tailwind CSS**.

## 🛠️ Tech Stack

* **Framework**: Angular v21
* **Styling**: Tailwind CSS
* **Charts**: Highcharts.js (via `highcharts-angular`)
* **State Management**: (Optional: Signals / RxJS)

## 📦 Prerequisites

Ensure you have the following installed:
* Node.js (Active LTS version)
* Angular CLI (`npm install -g @angular/cli`)

## ⚡ Getting Started

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/angular-dip-hunter.git](https://github.com/your-username/angular-dip-hunter.git)
    cd angular-dip-hunter
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    ng serve
    ```
    Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## 📐 Project Structure

```text
src/
├── app/
│   ├── core/              # Singleton services, guards, and models
│   ├── features/
│   │   ├── dashboard/     # Main dip-tracking dashboard
│   │   ├── growth-twenty/ # Logic for Growth portfolio
│   │   └── dividend-ten/  # Logic for Dividend portfolio
│   ├── shared/            # Shared UI components (Highcharts wrappers)
│   └── app.component.ts
├── assets/
└── styles.css             # Tailwind imports
